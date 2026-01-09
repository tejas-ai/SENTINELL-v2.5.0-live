import React, { useState } from 'react';
import { APP_NAME, APP_VERSION } from './constants';
import { AnalysisMode, FileData, AnalysisResult } from './types';
import FileUpload from './components/FileUpload';
import AnalysisDisplay from './components/AnalysisDisplay';
import { analyzeAudio, analyzeSpectrogram } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AnalysisMode>(AnalysisMode.AUDIO);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetAnalysis = () => {
    setFileData(null);
    setResult(null);
    setError(null);
  };

  const handleModeChange = (newMode: AnalysisMode) => {
    setMode(newMode);
    resetAnalysis();
  };

  const handleFileSelect = async (data: FileData) => {
    setFileData(data);
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let analysisResult;
      if (mode === AnalysisMode.AUDIO) {
        analysisResult = await analyzeAudio(data.base64, data.mimeType);
      } else {
        analysisResult = await analyzeSpectrogram(data.base64, data.mimeType);
      }
      setResult(analysisResult);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-200 font-sans pb-20">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-sm flex items-center justify-center text-black font-bold font-mono text-lg shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              S
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-white leading-none">{APP_NAME}</h1>
              <span className="text-[10px] text-cyan-500 font-mono tracking-widest">{APP_VERSION}</span>
            </div>
          </div>
          <nav className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => handleModeChange(AnalysisMode.AUDIO)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
                mode === AnalysisMode.AUDIO 
                  ? 'bg-slate-700 text-cyan-400 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Native Audio
            </button>
            <button
              onClick={() => handleModeChange(AnalysisMode.SPECTROGRAM)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
                mode === AnalysisMode.SPECTROGRAM 
                  ? 'bg-slate-700 text-cyan-400 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Visual Forensics
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {/* Intro Text */}
        <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              {mode === AnalysisMode.AUDIO ? 'Deepfake Audio Detection' : 'Spectrogram Forensics'}
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
              {mode === AnalysisMode.AUDIO 
                ? "Analyze audio files for microscopic artifacts, spectral inconsistencies, and unnatural prosody using Sentinell's psychoacoustic engine." 
                : "Deploy computer vision to scan Mel-Spectrograms for GAN artifacts, checkerboard effects, and spectral discontinuities."}
            </p>
        </div>

        {/* Input Area */}
        {!fileData && (
          <FileUpload 
            mode={mode} 
            onFileSelect={handleFileSelect} 
            isLoading={isAnalyzing} 
          />
        )}

        {/* Analysis State */}
        {fileData && (
          <div className="space-y-8">
            
            {/* File Preview Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center text-slate-500 shrink-0">
                   {mode === AnalysisMode.AUDIO ? (
                     <span className="text-xs font-mono">MP3</span>
                   ) : (
                     <img src={fileData.previewUrl} alt="preview" className="w-full h-full object-cover rounded" />
                   )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{fileData.file.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{(fileData.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              
              {!isAnalyzing && (
                 <button 
                  onClick={resetAnalysis}
                  className="px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-950/30 rounded border border-transparent hover:border-red-900 transition-colors"
                 >
                   Remove
                 </button>
              )}
            </div>

            {/* Audio Player if Audio Mode (Pre-analysis or during analysis only) */}
            {mode === AnalysisMode.AUDIO && !isAnalyzing && !result && (
              <audio controls className="w-full h-10 block rounded opacity-80" src={fileData.previewUrl} />
            )}

            {/* Loading Animation */}
            {isAnalyzing && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 h-full w-1/3 bg-cyan-500 blur-[4px] animate-[loading_1s_infinite_ease-in-out]"></div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white animate-pulse">Analyzing Physics...</h3>
                    <p className="text-slate-500 font-mono text-sm mt-2">
                      {mode === AnalysisMode.AUDIO ? 'Detecting micro-tremors & phase glitches' : 'Scanning for GAN checkerboard patterns'}
                    </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-lg text-center">
                <p className="text-red-400 font-medium">Analysis Error</p>
                <p className="text-red-300/70 text-sm mt-1">{error}</p>
                <button 
                  onClick={resetAnalysis}
                  className="mt-4 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-sm rounded transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Result Display */}
            {result && !isAnalyzing && (
              <AnalysisDisplay 
                result={result} 
                mode={mode} 
                audioUrl={mode === AnalysisMode.AUDIO ? fileData.previewUrl : undefined}
              />
            )}

            {/* Reset / New Analysis Button (only if finished) */}
            {result && (
              <div className="text-center pt-8">
                <button
                  onClick={resetAnalysis}
                  className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-900/20 transition-all hover:scale-105 active:scale-95"
                >
                  Analyze New File
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};

export default App;
