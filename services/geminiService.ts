import { GoogleGenAI, Schema, Type, Modality } from "@google/genai";
import { AudioAnalysisResult, VisualAnalysisResult, TranscriptionResult, ScamRiskResult } from '../types';

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

// --- Transcription Service (Using gemini-3-flash-preview) ---

const TRANSCRIPTION_PROMPT = "Transcribe the following audio exactly as spoken. Identify the language if possible.";

const transcriptionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING, description: "Full transcript of the audio" },
    detected_language: { type: Type.STRING, description: "Language code (e.g., en-US)" },
    summary: { type: Type.STRING, description: "Brief summary of the content" }
  },
  required: ["transcript"]
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<TranscriptionResult> => {
  const client = getClient();

  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
            inlineData: {
                mimeType: mimeType,
                data: base64Audio
            }
        },
        { text: TRANSCRIPTION_PROMPT }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: transcriptionSchema
    }
  });

  if (!response.text) throw new Error("No response from AI");

  try {
    return JSON.parse(response.text) as TranscriptionResult;
  } catch (e) {
    return { transcript: response.text, detected_language: 'unknown', summary: 'Parsing failed' };
  }
};

// --- Scam Risk Detection (Using gemini-2.5-flash-lite) ---

const SCAM_CHECK_PROMPT = `Analyze the following text for signs of a scam, social engineering, or fraud attempt.
Focus on urgency, financial demands, threats, or requests for sensitive information.
Rate the risk level and provide a warning if necessary.`;

const scamRiskSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    risk_level: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    risk_score: { type: Type.NUMBER, description: "0 to 100" },
    detected_patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
    warning_message: { type: Type.STRING, description: "Short warning for the user" }
  },
  required: ["risk_level", "risk_score", "detected_patterns", "warning_message"]
};

export const checkScamRisk = async (text: string): Promise<ScamRiskResult> => {
  const client = getClient();
  
  // Using gemini-2.5-flash-lite as requested for fast AI responses
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash-lite', 
    contents: {
        parts: [{ text: `${SCAM_CHECK_PROMPT}\n\nTEXT:\n${text}` }]
    },
    config: {
        responseMimeType: "application/json",
        responseSchema: scamRiskSchema
    }
  });

  if (!response.text) throw new Error("No response from AI");

  try {
    return JSON.parse(response.text) as ScamRiskResult;
  } catch (e) {
    return { risk_level: "LOW", risk_score: 0, detected_patterns: [], warning_message: "Could not analyze" };
  }
};

// --- Live API Connect ---

export const connectLiveSession = async (callbacks: any) => {
    const client = getClient();
    return await client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            systemInstruction: `You are "Sentinell," a vigilant AI forensic assistant. 
            You are listening to a live call to protect the user.
            If you hear something suspicious, warn the user concisely.
            Otherwise, acknowledge and analyze the audio quality for synthesis artifacts.`,
            inputAudioTranscription: { model: "gemini-3-flash-preview" }, // Use model for transcription
            outputAudioTranscription: { model: "gemini-3-flash-preview" }
        }
    });
}
