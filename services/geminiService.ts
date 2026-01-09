import { GoogleGenAI, Schema, Type, LiveServerMessage, Modality } from "@google/genai";
import { AudioAnalysisResult, VisualAnalysisResult, ScamRiskResult, TranscriptionResult } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  return new GoogleGenAI({ apiKey });
};

// --- Audio Analysis ---

const AUDIO_SYSTEM_INSTRUCTION = `You are "Sentinell," an expert Forensic Audio Analyst and Psychoacoustic Engineer specializing in the detection of AI-generated synthetic speech (Deepfakes).

Your objective is to analyze audio inputs for microscopic artifacts, spectral inconsistencies, and unnatural prosody that betray machine generation. You do not strictly trust the "sound" of the voice, as generative AI can mimic timber perfectly. Instead, you analyze the physics of the audio.

Your analysis must be technical, objective, and structured. You must identify specific timestamps where artifacts occur.`;

const AUDIO_PROMPT = `Analyze the attached audio file for forensic evidence of synthetic generation (Text-to-Speech, Voice Conversion, or AI Cloning).

Perform a step-by-step acoustic analysis focusing on these four Deepfake indicators:

1. High-Frequency Spectral Cutoff: Listen for unnatural "hard cuts" or "smearing" in the high frequencies (above 16kHz).
2. Prosody and Micro-Tremors: Analyze the breathing patterns. Is the rhythm perfectly isosynchronous (robotic) or natural?
3. Phase & Glitches: Detect any metallic "twang," robotic clicking, or phase continuity issues.
4. Background Noise Floor: Check if the background noise is organic or cuts to absolute "digital silence" between words.

Return ONLY JSON.`;

const audioResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis_timestamp: { type: Type.STRING, description: "MM:SS of key artifact or 'N/A'" },
    technical_observations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of technical observations"
    },
    human_likelihood_score: { type: Type.STRING, description: "0-100%" },
    verdict: { type: Type.STRING, enum: ["REAL HUMAN", "SYNTHETIC AI"] },
    explanation: { type: Type.STRING, description: "One-sentence summary" }
  },
  required: ["analysis_timestamp", "technical_observations", "human_likelihood_score", "verdict", "explanation"]
};

export const analyzeAudio = async (base64Audio: string, mimeType: string): Promise<AudioAnalysisResult> => {
  const client = getClient();
  
  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview', // Capable of handling audio files
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Audio
          }
        },
        { text: AUDIO_PROMPT }
      ]
    },
    config: {
      systemInstruction: AUDIO_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: audioResponseSchema
    }
  });

  if (!response.text) throw new Error("No response from AI");
  
  try {
    return JSON.parse(response.text) as AudioAnalysisResult;
  } catch (e) {
    console.error("Failed to parse JSON", response.text);
    throw new Error("Analysis failed to produce valid JSON.");
  }
};

// --- Spectrogram Analysis ---

const VISUAL_SYSTEM_INSTRUCTION = `You are "Sentinell Vision," a Computer Vision specialist trained to detect GAN (Generative Adversarial Network) artifacts in visual spectrograms. You analyze Mel-Spectrogram images to detect Deepfake audio signatures.`;

const VISUAL_PROMPT = `Analyze this spectrogram image for visual artifacts typical of AI-generated audio.

Focus your visual scan on:
1. The Checkerboard Effect: Look for repeating, grid-like patterns.
2. Spectral Continuity: Check vertical lines (fricatives).
3. Frequency Cutoffs: Look for hard, straight black lines cutting off frequencies.

Based on these visual markers, determine if the source audio is Real or Fake.`;

const visualResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verdict: { type: Type.STRING, description: "Real or Fake" },
    confidence: { type: Type.STRING, description: "0-100%" },
    visual_evidence: { type: Type.STRING, description: "Detailed description of visual artifacts found." }
  },
  required: ["verdict", "confidence", "visual_evidence"]
};

export const analyzeSpectrogram = async (base64Image: string, mimeType: string): Promise<VisualAnalysisResult> => {
  const client = getClient();

  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        },
        { text: VISUAL_PROMPT }
      ]
    },
    config: {
      systemInstruction: VISUAL_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: visualResponseSchema
    }
  });

  if (!response.text) throw new Error("No response from AI");

  try {
    return JSON.parse(response.text) as VisualAnalysisResult;
  } catch (e) {
    console.error("Failed to parse JSON", response.text);
    throw new Error("Analysis failed to produce valid JSON.");
  }
};

// --- Live API ---

export const connectLiveSession = (callbacks: {
  onopen?: () => void;
  onmessage?: (message: LiveServerMessage) => void;
  onclose?: (event: CloseEvent) => void;
  onerror?: (event: ErrorEvent) => void;
}) => {
  const client = getClient();
  return client.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks: callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction: 'You are Sentinell, an advanced AI security monitor observing a conversation for potential scams or social engineering.',
      inputAudioTranscription: {}, 
      outputAudioTranscription: {},
    },
  });
};

// --- Scam Risk Check ---

const SCAM_RISK_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    risk_score: { type: Type.INTEGER, description: "0-100" },
    risk_level: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    warning_message: { type: Type.STRING },
    detected_patterns: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["risk_score", "risk_level", "warning_message", "detected_patterns"]
};

export const checkScamRisk = async (text: string): Promise<ScamRiskResult> => {
  const client = getClient();
  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following text for scam indicators, social engineering, or fraudulent patterns. Text: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: SCAM_RISK_SCHEMA
    }
  });

  if (!response.text) throw new Error("No response");
  return JSON.parse(response.text) as ScamRiskResult;
};

// --- Transcription ---

const TRANSCRIPTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING },
    detected_language: { type: Type.STRING },
    summary: { type: Type.STRING }
  },
  required: ["transcript", "detected_language", "summary"]
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<TranscriptionResult> => {
  const client = getClient();
  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Audio } },
        { text: "Transcribe this audio verbatim and provide a brief summary." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: TRANSCRIPTION_SCHEMA
    }
  });

  if (!response.text) throw new Error("No response");
  return JSON.parse(response.text) as TranscriptionResult;
};