export enum AnalysisMode {
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE'
}

export interface AudioArtifact {
  name: string;
  description: string;
  timestamp: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface AudioAnalysisResult {
  analysis_timestamp: string;
  audio_artifacts: AudioArtifact[];
  human_likelihood_score: string;
  verdict: "REAL HUMAN" | "SYNTHETIC AI";
  explanation: string;
}

export interface VisualArtifact {
  name: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

export interface VisualAnalysisResult {
  verdict: "REAL HUMAN" | "SYNTHETIC AI";
  risk_score: number; // 0 - 100
  confidence: string; // Keep for display text
  visual_artifacts: VisualArtifact[];
  metadata_analysis: {
    exif_integrity: "INTACT" | "STRIPPED" | "INCONSISTENT";
    software_traces: string;
    lighting_consistency: "NATURAL" | "ARTIFICIAL/MISMATCHED";
  };
  explanation: string;
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
  file: File | null; // Allow null for URL based
  fileName: string;
  fileSize: string;
  previewUrl: string;
  base64: string;
  mimeType: string;
}