import React, { useEffect, useRef, useState } from 'react';
import { LiveServerMessage } from '@google/genai';
import { connectLiveSession, checkScamRisk } from '../services/geminiService';
import { createBlob, decodeAudioData, decode } from '../utils/audioUtils';
import { ScamRiskResult } from '../types';
import { IconMicrophone, IconZap, IconAlert, IconCheckBadge } from '../constants';

const LiveMonitor: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<{user: string, model: string}[]>([]);
  const [currentTurn, setCurrentTurn] = useState({user: '', model: ''});
  const [scamRisk, setScamRisk] = useState<ScamRiskResult | null>(null);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (sessionRef.current) {
       // Ideally we close session but library doesn't expose clean close on promise sometimes, assume disconnect handles it or reload
       // sessionRef.current.close(); 
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
  };

  useEffect(() => {
    return () => cleanupAudio();
  }, []);

  const handleStart = async () => {
    try {
      setIsConnected(true);
      setTranscript([]);
      setScamRisk(null);

      const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputContextRef.current = inputContext;
      audioContextRef.current = outputContext;
      nextStartTimeRef.current = outputContext.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const outputNode = outputContext.createGain();
      outputNode.connect(outputContext.destination);

      const sessionPromise = connectLiveSession({
        onopen: () => {
          console.log("Session opened");
          const source = inputContext.createMediaStreamSource(stream);
          const scriptProcessor = inputContext.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (e) => {
             const inputData = e.inputBuffer.getChannelData(0);
             const pcmBlob = createBlob(inputData);
             sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
          };
          
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputContext.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
            if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                setCurrentTurn(prev => {
                    const newVal = { ...prev, user: prev.user + text };
                    // Trigger "Fast AI" scam check on user input chunks
                    debouncedScamCheck(newVal.user);
                    return newVal;
                });
            }
            if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                setCurrentTurn(prev => ({ ...prev, model: prev.model + text }));
            }

            if (message.serverContent?.turnComplete) {
                setTranscript(prev => [...prev, currentTurn]);
                setCurrentTurn({ user: '', model: '' });
            }

            // Handle Audio
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const ctx = audioContextRef.current;
                if (!ctx) return;
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    ctx,
                    24000,
                    1
                );
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
            }
        },
        onclose: () => {
          console.log("Session closed");
          setIsConnected(false);
        },
        onerror: (err: any) => {
          console.error("Session error", err);
          setIsConnected(false);
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error(e);
      setIsConnected(false);
    }
  };

  const handleStop = () => {
    setIsConnected(false);
    cleanupAudio();
  };

  // Debounce for scam check to avoid hitting API on every character
  const timeoutRef = useRef<any>(null);
  const debouncedScamCheck = (text: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
         if (text.length > 10) {
            const risk = await checkScamRisk(text);
            if (risk.risk_level !== 'LOW') {
                setScamRisk(risk);
            }
         }
      }, 1500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-12 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Control Panel */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
           <h3 className="text-xl font-bold text-white flex items-center gap-2">
             <IconMicrophone />
             Live Monitor
           </h3>
           <p className="text-slate-400 text-sm mt-1">Real-time bi-directional analysis with Gemini 2.5</p>
        </div>
        
        <button
          onClick={isConnected ? handleStop : handleStart}
          className={`px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
            isConnected 
              ? 'bg-red-500/20 text-red-400 border border-red-500 hover:bg-red-500/30 animate-pulse' 
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/20'
          }`}
        >
          {isConnected ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Transcript Column */}
         <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 h-[500px] flex flex-col">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Live Transcript</h4>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {transcript.map((t, i) => (
                    <div key={i} className="space-y-2">
                        {t.user && <div className="p-3 bg-slate-800/50 rounded-lg rounded-tl-none text-slate-200 text-sm self-start"><span className="text-cyan-500 text-xs font-bold block mb-1">SUSPECT</span>{t.user}</div>}
                        {t.model && <div className="p-3 bg-cyan-900/20 border border-cyan-900/50 rounded-lg rounded-tr-none text-cyan-100 text-sm self-end text-right"><span className="text-cyan-400 text-xs font-bold block mb-1">SENTINELL</span>{t.model}</div>}
                    </div>
                ))}
                {(currentTurn.user || currentTurn.model) && (
                    <div className="space-y-2 opacity-70">
                        {currentTurn.user && <div className="p-3 bg-slate-800/50 rounded-lg rounded-tl-none text-slate-200 text-sm"><span className="text-cyan-500 text-xs font-bold block mb-1">LISTENING...</span>{currentTurn.user}</div>}
                        {currentTurn.model && <div className="p-3 bg-cyan-900/20 border border-cyan-900/50 rounded-lg rounded-tr-none text-cyan-100 text-sm text-right"><span className="text-cyan-400 text-xs font-bold block mb-1">ANALYZING...</span>{currentTurn.model}</div>}
                    </div>
                )}
                {transcript.length === 0 && !currentTurn.user && (
                    <div className="h-full flex items-center justify-center text-slate-600 italic">
                        {isConnected ? "Listening for audio..." : "Start monitoring to begin session"}
                    </div>
                )}
            </div>
         </div>

         {/* Analysis Column */}
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-[500px] flex flex-col">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <IconZap /> Real-time Risk Assessment
            </h4>
            
            <div className="flex-1 flex flex-col gap-4">
                {/* Risk Gauge */}
                <div className={`flex-1 rounded-lg border-2 flex flex-col items-center justify-center text-center p-4 transition-colors duration-500 ${
                    !scamRisk ? 'border-slate-800 bg-slate-800/20' :
                    scamRisk.risk_level === 'LOW' ? 'border-emerald-500/30 bg-emerald-900/10' :
                    scamRisk.risk_level === 'MEDIUM' ? 'border-yellow-500/30 bg-yellow-900/10' :
                    'border-red-500 bg-red-900/20 animate-pulse'
                }`}>
                    {!scamRisk ? (
                        <div className="text-slate-500">
                             <div className="text-4xl mb-2">--</div>
                             <div className="text-xs uppercase">No Risk Detected</div>
                        </div>
                    ) : (
                        <div>
                             <div className={`text-5xl font-black mb-2 ${
                                 scamRisk.risk_level === 'CRITICAL' || scamRisk.risk_level === 'HIGH' ? 'text-red-500' : 
                                 scamRisk.risk_level === 'MEDIUM' ? 'text-yellow-400' : 'text-emerald-400'
                             }`}>
                                 {scamRisk.risk_score}
                             </div>
                             <div className="text-xs font-bold uppercase tracking-widest text-slate-300">
                                 {scamRisk.risk_level} RISK
                             </div>
                        </div>
                    )}
                </div>

                {/* Warnings */}
                {scamRisk && (
                    <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-2">Analysis Log</div>
                        <p className="text-sm text-white font-medium mb-3">"{scamRisk.warning_message}"</p>
                        <div className="space-y-1">
                            {scamRisk.detected_patterns.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-red-300 bg-red-900/20 px-2 py-1 rounded">
                                    <IconAlert /> {p}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                 {/* Status */}
                 <div className="mt-auto pt-4 border-t border-slate-800 text-center">
                     <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isConnected ? 'bg-cyan-900/30 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                         <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`}></span>
                         {isConnected ? 'Gemini 2.5 Live Connected' : 'System Offline'}
                     </span>
                 </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
