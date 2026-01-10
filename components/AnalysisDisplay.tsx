import React from 'react';
import { jsPDF } from 'jspdf';
import { AnalysisResult, AudioAnalysisResult, VisualAnalysisResult, AnalysisMode } from '../types';
import { IconCheckBadge, IconAlert, IconGrid, IconDocumentText } from '../constants';
import AudioVisualizer from './AudioVisualizer';
import ForensicCockpit from './ForensicCockpit';

interface AnalysisDisplayProps {
  result: AnalysisResult;
  mode: AnalysisMode;
  fileUrl?: string; 
  fileName?: string;
  base64?: string;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result, mode, fileUrl, fileName, base64 }) => {
  const isAudio = mode === AnalysisMode.AUDIO;
  
  // Type Guard Helpers
  const isAudioResult = (r: AnalysisResult): r is AudioAnalysisResult => {
    return (r as AudioAnalysisResult).audio_artifacts !== undefined;
  };

  const isVisualResult = (r: AnalysisResult): r is VisualAnalysisResult => {
    return (r as VisualAnalysisResult).risk_score !== undefined;
  };

  // --- PDF GENERATION HELPERS FOR AUDIO ---

  const generateAudioPieChart = (scoreString: string, isSynthetic: boolean): string => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Parse score. e.g. "98%" -> 98. Handle potential NaNs safely.
      let humanScore = parseInt(scoreString.replace(/[^0-9]/g, '')) || 0;
      
      // Determine what to show. 
      // If verdict is SYNTHETIC, we typically show "AI Probability".
      // If human score is 2%, then AI Prob is 98%.
      let chartScore = isSynthetic ? (100 - humanScore) : humanScore;
      let label = isSynthetic ? "AI PROBABILITY" : "HUMAN PROBABILITY";
      let color = isSynthetic ? '#ef4444' : '#10b981'; // Red vs Emerald

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = 150;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + ((chartScore / 100) * (Math.PI * 2));

      // Background Circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#f1f5f9'; // slate-100
      ctx.fill();

      // Score Slice
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.lineTo(cx, cy);
      ctx.fillStyle = color;
      ctx.fill();

      // Center Hole (Donut)
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${chartScore}%`, cx, cy);

      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText(label, cx, cy + 45);

      return canvas.toDataURL('image/png');
  };

  const handleGenerateAudioReport = () => {
    if (!isAudio || !isAudioResult(result)) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = 20;
    const isSynthetic = result.verdict === "SYNTHETIC AI";

    // 1. Header Section
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(34, 211, 238); // Cyan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SENTINELL", margin, 20);
    doc.setFontSize(10);
    doc.text("AUDIO FORENSICS REPORT", margin, 26);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, 20, { align: 'right' });
    doc.text(`CASE ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, pageWidth - margin, 26, { align: 'right' });

    yPos = 55;

    // 2. Verdict Section
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("ANALYSIS VERDICT:", margin, yPos);
    yPos += 10;

    doc.setFontSize(28);
    if (isSynthetic) {
        doc.setTextColor(239, 68, 68); // Red
        doc.text("SYNTHETIC / AI GENERATED", margin, yPos);
    } else {
        doc.setTextColor(16, 185, 129); // Emerald
        doc.text("REAL HUMAN VOICE", margin, yPos);
    }
    yPos += 20;

    // 3. Visuals: Pie Chart & Summary
    // We place the chart on the right, summary on the left
    const chartUrl = generateAudioPieChart(result.human_likelihood_score, isSynthetic);
    if (chartUrl) {
         doc.addImage(chartUrl, 'PNG', pageWidth - margin - 80, yPos - 10, 80, 80);
    }

    // Summary Text Block
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE SUMMARY", margin, yPos);
    yPos += 8;
    
    doc.setFont("helvetica", "normal");
    const splitSummary = doc.splitTextToSize(result.explanation, pageWidth - margin - 100); // Leave room for chart
    doc.text(splitSummary, margin, yPos);
    
    // File Info below summary
    yPos += (splitSummary.length * 5) + 15;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, yPos, pageWidth - margin - 100, 25, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`FILE: ${fileName || 'Unknown.mp3'}`, margin + 5, yPos + 8);
    doc.text(`PRIMARY ANOMALY: ${result.analysis_timestamp}`, margin + 5, yPos + 16);

    yPos += 45; // Move past chart area

    // 4. Evidence Log Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("DETECTED ACOUSTIC ARTIFACTS", margin, yPos);
    doc.setDrawColor(15, 23, 42);
    doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
    yPos += 10;

    // 5. Evidence Log Loop
    if (result.audio_artifacts.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("No significant artifacts detected. Audio appears consistent with natural physics.", margin, yPos);
    } else {
        result.audio_artifacts.forEach((artifact) => {
             // Page Break Check
             if (yPos > pageHeight - 30) {
                 doc.addPage();
                 yPos = 20;
             }

             // Artifact Row
             // Timestamp Badge style
             doc.setFillColor(30, 41, 59);
             doc.roundedRect(margin, yPos - 4, 25, 6, 1, 1, 'F');
             doc.setTextColor(34, 211, 238);
             doc.setFont("courier", "bold");
             doc.setFontSize(9);
             doc.text(artifact.timestamp, margin + 2, yPos);

             // Artifact Name
             doc.setFont("helvetica", "bold");
             doc.setFontSize(11);
             doc.setTextColor(0, 0, 0);
             doc.text(artifact.name, margin + 30, yPos);

             // Severity
             doc.setFontSize(9);
             if(artifact.severity === 'HIGH') doc.setTextColor(220, 38, 38);
             else if(artifact.severity === 'MEDIUM') doc.setTextColor(202, 138, 4);
             else doc.setTextColor(71, 85, 105);
             doc.text(`SEVERITY: ${artifact.severity}`, pageWidth - margin, yPos, { align: 'right' });

             yPos += 5;

             // Description
             doc.setFont("helvetica", "normal");
             doc.setFontSize(10);
             doc.setTextColor(51, 65, 85); // Slate 700
             const descLines = doc.splitTextToSize(artifact.description, pageWidth - margin - 30);
             doc.text(descLines, margin + 30, yPos);
             
             yPos += (descLines.length * 5) + 8;
        });
    }

    // Footer
    const footerText = "Generated by Sentinell AI Forensics System v2.6.0 | Confidential Forensic Report";
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    doc.save(`Sentinell_Audio_Report_${fileName}.pdf`);
  };

  // --- RENDER LOGIC ---

  if (!isAudio && isVisualResult(result) && fileUrl) {
      return <ForensicCockpit result={result} imageUrl={fileUrl} fileName={fileName} base64Image={base64} />;
  }

  // Fallback for Audio or if something goes wrong (Legacy Audio View)
  if (isAudio && isAudioResult(result)) {
    const isHuman = result.verdict === "REAL HUMAN";
    
    return (
        <div className="w-full max-w-2xl mx-auto animate-[fadeIn_0.5s_ease-out]">
          {/* Verdict Banner */}
          <div className={`
            relative overflow-hidden rounded-t-xl p-6 text-center border-b border-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-4
            ${isHuman 
                ? 'bg-gradient-to-b from-emerald-900/40 to-slate-900 border-t-4 border-t-emerald-500' 
                : 'bg-gradient-to-b from-red-900/40 to-slate-900 border-t-4 border-t-red-500'
            }
          `}>
            {/* Verdict Text */}
            <div className="relative z-10 flex items-center gap-4 text-left">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${isHuman ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {isHuman ? <IconCheckBadge /> : <IconAlert />}
                </div>
                <div>
                    <h2 className="text-2xl font-black tracking-tighter text-white mb-0 uppercase leading-none">
                        {result.verdict}
                    </h2>
                    <p className={`text-xs font-mono tracking-widest uppercase opacity-75 mt-1 ${isHuman ? 'text-emerald-300' : 'text-red-300'}`}>
                        CONFIDENCE: {result.human_likelihood_score}
                    </p>
                </div>
            </div>

            {/* Export Button */}
            <button 
                onClick={handleGenerateAudioReport}
                className="relative z-10 flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-white text-xs font-bold rounded shadow-lg transition-all transform active:scale-95 uppercase tracking-wider group"
            >
                <IconDocumentText /> 
                <span>Export Report</span>
            </button>
          </div>

          <div className="bg-slate-800/20 backdrop-blur-sm border border-t-0 border-slate-700 rounded-b-xl p-6 md:p-8 space-y-6">
                {fileUrl && (
                <AudioVisualizer 
                    audioUrl={fileUrl} 
                    highlightTimestamp={result.analysis_timestamp}
                />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                        <span className="text-xs uppercase tracking-widest text-slate-500 block mb-1">Human Likelihood</span>
                        <span className="text-2xl font-mono font-bold text-cyan-400">{result.human_likelihood_score}</span>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                        <span className="text-xs uppercase tracking-widest text-slate-500 block mb-1">Primary Anomaly</span>
                        <span className="text-2xl font-mono font-bold text-orange-400">{result.analysis_timestamp}</span>
                    </div>
                </div>
                
                {/* Evidence Log */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="bg-slate-950 p-3 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <IconGrid /> Evidence Log
                        </span>
                        <span className="text-[10px] text-cyan-500 font-mono">ACOUSTIC TRACES</span>
                    </div>
                    
                    <div className="p-4 space-y-3">
                        {result.audio_artifacts.length === 0 ? (
                            <p className="text-sm text-slate-500 italic text-center py-2">No anomalies detected.</p>
                        ) : (
                            result.audio_artifacts.map((artifact, idx) => (
                                <div key={idx} className="bg-slate-800/50 p-3 rounded border border-slate-700 hover:border-slate-500 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                                artifact.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' : 
                                                artifact.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 
                                                'bg-slate-600/20 text-slate-400'
                                            }`}>
                                                {artifact.severity}
                                            </span>
                                            <span className="text-sm font-bold text-slate-200">{artifact.name}</span>
                                        </div>
                                        <span className="text-xs font-mono text-cyan-500 bg-cyan-900/20 px-1 rounded">
                                            {artifact.timestamp}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed pl-1 mt-1">
                                        {artifact.description}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                
                <div className="bg-slate-800/30 p-4 rounded border-l-2 border-cyan-500">
                    <h3 className="text-xs font-bold text-cyan-500 uppercase mb-1">Analyst Explanation</h3>
                    <p className="text-slate-300 italic">"{result.explanation}"</p>
                </div>
          </div>
        </div>
    );
  }

  return null;
};

export default AnalysisDisplay;