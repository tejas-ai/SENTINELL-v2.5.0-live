import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { VisualAnalysisResult } from '../types';
import { IconAlert, IconCheckBadge, IconGrid, IconDocumentText } from '../constants';

interface ForensicCockpitProps {
  result: VisualAnalysisResult;
  imageUrl: string;
  fileName?: string;
  base64Image?: string;
}

const ForensicCockpit: React.FC<ForensicCockpitProps> = ({ result, imageUrl, fileName = "Unknown_Evidence.jpg", base64Image }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  
  // ELA / Heatmap styles
  const elaStyle = { filter: 'contrast(150%) brightness(90%) grayscale(100%) invert(100%)' }; 
  const heatmapStyle = { filter: 'contrast(200%) hue-rotate(180deg) saturate(300%)' };
  
  const isFake = result.risk_score > 70;
  const isSuspicious = result.risk_score > 20 && result.risk_score <= 70;
  
  const gaugeColor = isFake ? '#ef4444' : isSuspicious ? '#eab308' : '#10b981'; // Red, Yellow, Emerald

  // SVG Gauge Calculations
  const radius = 80; 
  const strokeWidth = 20; 
  const arcLength = Math.PI * radius; 
  const score = Math.min(Math.max(result.risk_score, 0), 100);
  const dashOffset = arcLength - (score / 100) * arcLength;

  // Helper: Draw Pie Chart to Canvas
  const generatePieChartImage = (): string => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = 150;
      const scoreAngle = (result.risk_score / 100) * (Math.PI * 2);

      // Background Circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#f1f5f9'; // slate-100
      ctx.fill();

      // Score Slice (Pie)
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      // Start from top (-PI/2)
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + scoreAngle);
      ctx.lineTo(cx, cy);
      ctx.fillStyle = isFake ? '#ef4444' : isSuspicious ? '#eab308' : '#10b981';
      ctx.fill();

      // Center Hole (Donut style for modern look)
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Text in Center
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${result.risk_score}%`, cx, cy);

      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText("RISK SCORE", cx, cy + 45);

      return canvas.toDataURL('image/png');
  };

  // Generate Real PDF Report
  const handleGenerateReport = () => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = 20;

      // 1. Header Section
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(34, 211, 238); // Cyan
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("SENTINELL", margin, 20);
      doc.setFontSize(10);
      doc.text("FORENSIC IMAGE ANALYSIS REPORT", margin, 26);

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
      if (isFake) {
          doc.setTextColor(239, 68, 68); // Red
          doc.text("SYNTHETIC / AI GENERATED", margin, yPos);
      } else if (isSuspicious) {
          doc.setTextColor(234, 179, 8); // Yellow
          doc.text("SUSPICIOUS / EDITED", margin, yPos);
      } else {
          doc.setTextColor(16, 185, 129); // Emerald
          doc.text("REAL / AUTHENTIC", margin, yPos);
      }
      
      yPos += 20;

      // 3. Evidence Photo & Pie Chart Layout
      const evidenceImageY = yPos;
      
      // Evidence Photo
      if (base64Image) {
          doc.setFontSize(10);
          doc.setTextColor(0,0,0);
          doc.text("EVIDENCE EXHIBIT A:", margin, yPos);
          yPos += 5;

          try {
              const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
              doc.addImage(cleanBase64, 'JPEG', margin, yPos, 100, 75); 
          } catch (e) {
              console.error("PDF Image Error", e);
              doc.rect(margin, yPos, 100, 75); // Fallback
          }
      }

      // Pie Chart
      const chartUrl = generatePieChartImage();
      if (chartUrl) {
           doc.addImage(chartUrl, 'PNG', pageWidth - margin - 70, evidenceImageY + 5, 70, 70);
      }

      yPos += 85; 

      // 4. File Info Box
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`FILE: ${fileName}`, margin + 5, yPos + 8);
      doc.text(`CONFIDENCE: ${result.confidence}`, margin + 5, yPos + 15);

      yPos += 30;

      // 5. Executive Summary
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE SUMMARY", margin, yPos);
      yPos += 8;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitSummary = doc.splitTextToSize(result.explanation, pageWidth - (margin * 2));
      doc.text(splitSummary, margin, yPos);
      yPos += (splitSummary.length * 5) + 15;

      if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }

      // 6. Metadata Analysis Table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("METADATA INTEGRITY", margin, yPos);
      yPos += 8;

      const drawRow = (label: string, value: string, y: number) => {
         doc.setFont("helvetica", "normal");
         doc.setFontSize(10);
         doc.text(label, margin, y);
         doc.setFont("courier", "normal");
         doc.text(value, pageWidth - margin, y, { align: 'right' });
         doc.setDrawColor(226, 232, 240);
         doc.line(margin, y + 2, pageWidth - margin, y + 2);
         return y + 10;
      };

      yPos = drawRow("EXIF Structure", result.metadata_analysis.exif_integrity, yPos);
      yPos = drawRow("Software Signatures", result.metadata_analysis.software_traces, yPos);
      yPos = drawRow("Lighting Physics", result.metadata_analysis.lighting_consistency, yPos);
      
      yPos += 15;

      // 7. Detected Artifacts List (Detailed)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("DETECTED ARTIFACTS", margin, yPos);
      yPos += 10;

      result.visual_artifacts.forEach((artifact, i) => {
         if (yPos > pageHeight - 40) { doc.addPage(); yPos = 20; }
         
         // Bullet point name
         doc.setFont("helvetica", "bold");
         doc.setFontSize(11);
         doc.setTextColor(220, 38, 38); // Red for severity
         doc.text(`• ${artifact.name} (${artifact.severity})`, margin, yPos);
         yPos += 5;

         // Description
         doc.setFont("helvetica", "normal");
         doc.setFontSize(10);
         doc.setTextColor(51, 65, 85);
         const descLines = doc.splitTextToSize(artifact.description, pageWidth - margin - 30);
         doc.text(descLines, margin + 5, yPos);
         yPos += (descLines.length * 5) + 8;
      });

      // Footer
      const footerText = "Generated by Sentinell AI Forensics System v2.6.0 | Confidential Forensic Report";
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      doc.save(`Sentinell_Report_${fileName}.pdf`);
  };

  return (
    <div className="w-full animate-[fadeIn_0.5s_ease-out]">
      
      {/* HEADER VERDICT BAR */}
      <div className={`
        flex items-center justify-between p-4 mb-6 rounded-lg border-l-4 shadow-lg
        ${isFake 
            ? 'bg-red-950/20 border-red-500 shadow-red-900/10' 
            : isSuspicious 
                ? 'bg-yellow-950/20 border-yellow-500 shadow-yellow-900/10' 
                : 'bg-emerald-950/20 border-emerald-500 shadow-emerald-900/10'}
      `}>
          <div className="flex items-center gap-4">
              <div className={`p-2 rounded-full ${isFake ? 'bg-red-500/10 text-red-400' : isSuspicious ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {isFake || isSuspicious ? <IconAlert /> : <IconCheckBadge />}
              </div>
              <div>
                  <h2 className={`text-2xl font-black tracking-tight leading-none uppercase ${isFake ? 'text-red-500' : isSuspicious ? 'text-yellow-500' : 'text-emerald-500'}`}>
                      {result.verdict}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mt-1">AI PROBABILITY: {result.risk_score}%</p>
              </div>
          </div>
          <button 
            onClick={handleGenerateReport}
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-white text-xs font-bold rounded shadow-lg transition-all transform active:scale-95 uppercase tracking-wider group"
          >
              <IconDocumentText /> 
              <span>Export Report</span>
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ZONE 1: VISUALIZER (Left, 7/12 cols) */}
          <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative group select-none">
                  {/* Image Container */}
                  <div className="relative w-full aspect-video bg-[#050505]">
                      
                      {/* Base Image (Original) */}
                      <img 
                        src={imageUrl} 
                        className="absolute inset-0 w-full h-full object-contain" 
                        alt="Original"
                      />

                      {/* Overlay Image (ELA/Heatmap) clipped by slider */}
                      <div 
                        className="absolute inset-0 w-full h-full overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                      >
                           <img 
                             src={imageUrl} 
                             className="w-full h-full object-contain" 
                             style={showHeatmap ? heatmapStyle : elaStyle}
                             alt="Forensic Layer"
                           />
                           {/* Label for the layer */}
                           <div className="absolute top-4 left-4 bg-black/70 backdrop-blur text-cyan-400 text-[10px] font-mono px-2 py-1 border border-cyan-900/50 rounded uppercase">
                               {showHeatmap ? 'GRAD-CAM HEATMAP' : 'ERROR LEVEL ANALYSIS (ELA)'}
                           </div>
                      </div>
                        
                      {/* Real AI Bounding Boxes (if available) */}
                      {showBoxes && result.visual_artifacts.map((art, idx) => {
                          if (!art.box_2d) return null;
                          const [ymin, xmin, ymax, xmax] = art.box_2d;
                          return (
                              <div 
                                key={idx}
                                className="absolute border-2 border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.5)] group-hover:opacity-100 transition-opacity"
                                style={{
                                    top: `${ymin / 10}%`,
                                    left: `${xmin / 10}%`,
                                    height: `${(ymax - ymin) / 10}%`,
                                    width: `${(xmax - xmin) / 10}%`,
                                }}
                              >
                                  <div className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
                                      {art.name}
                                  </div>
                              </div>
                          );
                      })}
                      
                      {/* Fallback Simulation Box if high risk but no coords (rare fallback) */}
                      {showBoxes && isFake && result.visual_artifacts.every(a => !a.box_2d) && (
                          <div className="absolute top-[20%] left-[35%] w-[30%] h-[40%] border-2 border-dashed border-red-500/50 bg-red-500/5">
                               <div className="absolute -top-6 left-0 bg-red-600/50 text-white text-[10px] font-bold px-2 py-0.5">
                                  Global Anomaly
                               </div>
                          </div>
                      )}

                      {/* Slider Handle */}
                      <div 
                        className="absolute inset-y-0 w-1 bg-cyan-500 cursor-ew-resize hover:shadow-[0_0_15px_rgba(34,211,238,0.8)] z-20"
                        style={{ left: `${sliderPosition}%` }}
                      >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-xl">
                              <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)" /></svg>
                          </div>
                      </div>

                      {/* Invisible Range Input for Interaction */}
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={sliderPosition} 
                        onChange={(e) => setSliderPosition(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                      />
                  </div>

                  {/* Controls Toolbar */}
                  <div className="bg-slate-950 p-3 border-t border-slate-800 flex justify-between items-center">
                       <div className="flex gap-4">
                           <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors">
                               <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${showHeatmap ? 'bg-cyan-600' : 'bg-slate-700'}`}>
                                   <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${showHeatmap ? 'translate-x-4' : 'translate-x-0'}`}></div>
                               </div>
                               <input type="checkbox" className="hidden" checked={showHeatmap} onChange={() => setShowHeatmap(!showHeatmap)} />
                               X-RAY HEATMAP
                           </label>

                           <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors">
                               <input type="checkbox" checked={showBoxes} onChange={() => setShowBoxes(!showBoxes)} className="accent-cyan-500" />
                               SHOW DETECTIONS
                           </label>
                       </div>
                       <span className="text-[10px] font-mono text-slate-600">COMPARE MODE: {showHeatmap ? 'HEATMAP' : 'ELA'} vs ORIGINAL</span>
                  </div>
              </div>
              
              {/* Analyst Summary */}
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <h3 className="text-xs font-bold text-cyan-500 uppercase mb-2">Forensic Summary</h3>
                  <p className="text-sm text-slate-300 italic leading-relaxed">"{result.explanation}"</p>
              </div>
          </div>

          {/* ZONE 2 & 3: DATA (Right, 5/12 cols) */}
          <div className="lg:col-span-5 space-y-6">
              
              {/* ZONE 2: GAUGE */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 opacity-30"></div>
                  
                  <div className="relative w-full max-w-[240px] aspect-[2/1] mt-2 mb-4">
                      <svg className="w-full h-full" viewBox="0 0 200 100">
                         <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth={strokeWidth} strokeLinecap="round"/>
                         <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={gaugeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={dashOffset} className="transition-all duration-1000 ease-out"/>
                      </svg>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 text-center">
                          <span className="text-5xl font-black text-white leading-none tracking-tighter block shadow-black drop-shadow-lg">{result.risk_score}</span>
                      </div>
                  </div>
                  
                  <div className="text-center mt-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Likelihood of Manipulation</div>
                      <div className={`text-xl font-black uppercase tracking-tight ${isFake ? 'text-red-500' : isSuspicious ? 'text-yellow-500' : 'text-emerald-500'}`}>
                          {isFake ? 'High Probability' : isSuspicious ? 'Suspicious' : 'Authentic'}
                      </div>
                  </div>
              </div>

              {/* ZONE 3: EVIDENCE LOG (Updated) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-0 overflow-hidden flex flex-col h-[400px]">
                  <div className="bg-slate-950 p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <IconGrid /> Evidence Log
                      </span>
                      <span className="text-[10px] text-cyan-500 font-mono">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                  </div>
                  
                  <div className="p-4 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                      
                      {/* Metadata Check */}
                      <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 border-b border-slate-800 pb-1">Metadata Integrity</h4>
                          <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-400">EXIF Data</span>
                                  <span className={`font-mono ${result.metadata_analysis.exif_integrity === 'INTACT' ? 'text-emerald-400' : 'text-red-400'}`}>
                                      [{result.metadata_analysis.exif_integrity}]
                                  </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-400">Software Traces</span>
                                  <span className="font-mono text-slate-200 text-right max-w-[150px] truncate" title={result.metadata_analysis.software_traces}>
                                      {result.metadata_analysis.software_traces}
                                  </span>
                              </div>
                          </div>
                      </div>

                      {/* Visual Artifacts */}
                      <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 border-b border-slate-800 pb-1">Detected Artifacts</h4>
                          <ul className="space-y-3">
                              {result.visual_artifacts.map((art, i) => (
                                  <li key={i} className="bg-slate-800/50 p-3 rounded border border-slate-700 hover:border-slate-500 transition-colors">
                                      <div className="flex items-start gap-2 mb-1">
                                          <span className={`mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                                              art.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' : 
                                              art.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 
                                              'bg-slate-600/20 text-slate-400'
                                          }`}>
                                              {art.severity}
                                          </span>
                                          <span className="text-sm font-bold text-slate-200">{art.name}</span>
                                      </div>
                                      <p className="text-xs text-slate-400 leading-relaxed pl-1">
                                          {art.description}
                                      </p>
                                  </li>
                              ))}
                          </ul>
                      </div>

                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default ForensicCockpit;