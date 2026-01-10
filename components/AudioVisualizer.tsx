import React, { useEffect, useRef, useMemo } from 'react';

interface AudioVisualizerProps {
  audioUrl: string;
  highlightTimestamp?: string; // e.g., "0:04" or "MM:SS"
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioUrl, highlightTimestamp }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Parse timestamp string to seconds
  const highlightTime = useMemo(() => {
    if (!highlightTimestamp || highlightTimestamp === "N/A") return null;
    const parts = highlightTimestamp.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return null;
  }, [highlightTimestamp]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const initAudio = () => {
    if (!audioRef.current || audioContextRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 2048;

    const source = audioCtx.createMediaElementSource(audioRef.current);
    source.connect(analyzer);
    analyzer.connect(audioCtx.destination);

    audioContextRef.current = audioCtx;
    analyzerRef.current = analyzer;
  };

  const draw = () => {
    if (!canvasRef.current || !analyzerRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzerRef.current.getByteTimeDomainData(dataArray);

    // Clear canvas
    canvasCtx.fillStyle = 'rgb(2, 6, 23)'; // slate-950
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Waveform
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#22d3ee'; // cyan-400
    canvasCtx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();

    // Draw Highlight Marker logic
    // Note: Since this is a real-time visualizer of the *current* buffer, strictly mapping a specific absolute timestamp 
    // to a static position on a moving window is complex without pre-decoding the whole file. 
    // Instead, we will overlay an indicator when the current playback time is near the artifact timestamp.
    
    if (audioRef.current && highlightTime !== null) {
        const currentTime = audioRef.current.currentTime;
        const timeDiff = Math.abs(currentTime - highlightTime);
        
        // If we are within 1 second of the artifact, flash the screen/canvas border
        if (timeDiff < 1.0) {
             // Visual Alert Overlay
             canvasCtx.fillStyle = `rgba(249, 115, 22, ${1.0 - timeDiff})`; // Orange fade
             canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
             
             // Text indicator
             canvasCtx.fillStyle = '#ffffff';
             canvasCtx.font = '12px "JetBrains Mono"';
             canvasCtx.fillText(`ARTIFACT DETECTED @ ${highlightTimestamp}`, 10, 20);
             
             canvasCtx.strokeStyle = '#f97316'; // orange-500
             canvasCtx.lineWidth = 4;
             canvasCtx.strokeRect(0, 0, canvas.width, canvas.height);
        }
    }

    animationRef.current = requestAnimationFrame(draw);
  };

  const handlePlay = () => {
    initAudio();
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    draw();
  };

  // Seek to timestamp helper
  const seekToArtifact = () => {
      if(audioRef.current && highlightTime !== null) {
          audioRef.current.currentTime = highlightTime;
          audioRef.current.play();
      }
  }

  return (
    <div className="w-full bg-slate-900/50 rounded-xl p-4 border border-slate-800 shadow-lg mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
           <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
             Real-time Signal Analysis
           </span>
           
           {highlightTime !== null && (
               <button 
                onClick={seekToArtifact}
                className="text-xs font-mono bg-orange-900/30 text-orange-400 border border-orange-900/50 px-2 py-1 rounded hover:bg-orange-900/50 transition-colors"
               >
                   Jump to Artifact ({highlightTimestamp})
               </button>
           )}
        </div>
        
        <div className="relative">
            <canvas
            ref={canvasRef}
            className="w-full h-32 rounded-lg bg-slate-950 border border-slate-800/50 shadow-inner"
            width={800}
            height={128}
            />
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          className="w-full h-10 block rounded opacity-90"
          onPlay={handlePlay}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
};

export default AudioVisualizer;
