import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioUrl: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

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
    // 2048 fftSize gives a good balance for waveform resolution
    analyzer.fftSize = 2048;

    const source = audioCtx.createMediaElementSource(audioRef.current);
    source.connect(analyzer);
    analyzer.connect(audioCtx.destination);

    audioContextRef.current = audioCtx;
    analyzerRef.current = analyzer;
    sourceRef.current = source;
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

    animationRef.current = requestAnimationFrame(draw);
  };

  const handlePlay = () => {
    initAudio();
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    draw();
  };

  return (
    <div className="w-full bg-slate-900/50 rounded-xl p-4 border border-slate-800 shadow-lg mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
           <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
             Real-time Signal Analysis
           </span>
        </div>
        <canvas
          ref={canvasRef}
          className="w-full h-32 rounded-lg bg-slate-950 border border-slate-800/50 shadow-inner"
          width={800}
          height={128}
        />
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
