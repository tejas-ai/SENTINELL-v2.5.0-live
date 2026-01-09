import React from 'react';
import { AnalysisResult, AudioAnalysisResult, VisualAnalysisResult, AnalysisMode } from '../types';
import { IconCheckBadge, IconAlert } from '../constants';
import AudioVisualizer from './AudioVisualizer';

interface AnalysisDisplayProps {
  result: AnalysisResult;
  mode: AnalysisMode;
  audioUrl?: string;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result, mode, audioUrl }) => {
  const isAudio = mode === AnalysisMode.AUDIO;
  
  // Type Guard Helpers
  const isAudioResult = (r: AnalysisResult): r is AudioAnalysisResult => {
    return (r as AudioAnalysisResult).technical_observations !== undefined;
  };

  const isVisualResult = (r: AnalysisResult): r is VisualAnalysisResult => {
    return (r as VisualAnalysisResult).visual_evidence !== undefined;
  };

  let verdict = "UNKNOWN";
  let isHuman = false;
  let confidence = "";
  let details: React.ReactNode = null;

  if (isAudio && isAudioResult(result)) {
    verdict = result.verdict;
    isHuman = result.verdict === "REAL HUMAN";
    confidence = result.human_likelihood_score;
    details = (
      <div className="space-y-6">
        {/* Visualizer Inserted Here */}
        {audioUrl && (
          <AudioVisualizer audioUrl={audioUrl} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                <span className="text-xs uppercase tracking-widest text-slate-500 block mb-1">Human Likelihood</span>
                <span className="text-2xl font-mono font-bold text-cyan-400">{result.human_likelihood_score}</span>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                <span className="text-xs uppercase tracking-widest text-slate-500 block mb-1">Artifact Timestamp</span>
                <span className="text-2xl font-mono font-bold text-orange-400">{result.analysis_timestamp}</span>
            </div>
        </div>
        
        <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Technical Observations</h3>
            <ul className="space-y-2">
                {result.technical_observations.map((obs, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                        <span className="text-cyan-500 mt-1">▹</span>
                        {obs}
                    </li>
                ))}
            </ul>
        </div>
        
        <div className="bg-slate-800/30 p-4 rounded border-l-2 border-cyan-500">
            <h3 className="text-xs font-bold text-cyan-500 uppercase mb-1">Analyst Explanation</h3>
            <p className="text-slate-300 italic">"{result.explanation}"</p>
        </div>
      </div>
    );
  } else if (!isAudio && isVisualResult(result)) {
    verdict = result.verdict;
    // Simple heuristic for boolean check on visual verdict string
    isHuman = result.verdict.toLowerCase().includes("real"); 
    confidence = result.confidence;
    details = (
        <div className="space-y-6">
             <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                <span className="text-xs uppercase tracking-widest text-slate-500 block mb-1">Confidence Score</span>
                <span className="text-2xl font-mono font-bold text-cyan-400">{result.confidence}</span>
            </div>
            
            <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Visual Evidence</h3>
                <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-800 text-slate-300 text-sm leading-relaxed">
                    {result.visual_evidence}
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      {/* Verdict Banner */}
      <div className={`
        relative overflow-hidden rounded-t-xl p-6 text-center border-b border-slate-900/50
        ${isHuman 
            ? 'bg-gradient-to-b from-emerald-900/40 to-slate-900 border-t-4 border-t-emerald-500' 
            : 'bg-gradient-to-b from-red-900/40 to-slate-900 border-t-4 border-t-red-500'
        }
      `}>
        <div className="relative z-10">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isHuman ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {isHuman ? <IconCheckBadge /> : <IconAlert />}
            </div>
            <h2 className="text-3xl font-black tracking-tighter text-white mb-1 uppercase">
                {verdict}
            </h2>
            <p className={`text-sm font-mono tracking-widest uppercase opacity-75 ${isHuman ? 'text-emerald-300' : 'text-red-300'}`}>
                {mode} ANALYSIS COMPLETE
            </p>
        </div>
      </div>

      {/* Detailed Body */}
      <div className="bg-slate-800/20 backdrop-blur-sm border border-t-0 border-slate-700 rounded-b-xl p-6 md:p-8">
        {details}
      </div>
    </div>
  );
};

export default AnalysisDisplay;
