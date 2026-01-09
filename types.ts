export enum AnalysisMode {
  AUDIO = 'AUDIO',
  SPECTROGRAM = 'SPECTROGRAM'
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

export interface ScamRiskResult {
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  warning_message: string;
  detected_patterns: string[];
}

export interface TranscriptionResult {
  transcript: string;
  detected_language: string;
  summary: string;
}

export type AnalysisResult = AudioAnalysisResult | VisualAnalysisResult;

export interface FileData {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}