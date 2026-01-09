export enum AnalysisMode {
  AUDIO = 'AUDIO',
  SPECTROGRAM = 'SPECTROGRAM',
  LIVE_MONITOR = 'LIVE_MONITOR',
  TRANSCRIBER = 'TRANSCRIBER'
}

export interface AudioAnalysisResult {
  analysis_timestamp: string;
  technical_observations: string[];
  human_likelihood_score: string;
  verdict: "REAL HUMAN" | "SYNTHETIC AI";
  explanation: string;
}

export interface VisualAnalysisResult {
  verdict: string;
  confidence: string;
  visual_evidence: string;
}

export interface TranscriptionResult {
  transcript: string;
  detected_language?: string;
  summary?: string;
}

export interface ScamRiskResult {
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  risk_score: number;
  detected_patterns: string[];
  warning_message: string;
}

export type AnalysisResult = AudioAnalysisResult | VisualAnalysisResult | TranscriptionResult;

export interface FileData {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}
