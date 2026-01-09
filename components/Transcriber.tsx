import React, { useState, useRef } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { TranscriptionResult } from '../types';
import { IconDocumentText, IconMicrophone } from '../constants';
import { convertBlobToBase64 } from '../utils/audioUtils';

const Transcriber: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<TranscriptionResult | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await handleAnalyze(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setResult(null);
        } catch (e) {
            console.error("Microphone access denied", e);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleAnalyze = async (blob: Blob) => {
        setIsProcessing(true);
        try {
            const base64 = await convertBlobToBase64(blob);
            // Using generic audio type for upload usually works, or map mimeType from blob
            const data = await transcribeAudio(base64, blob.type || 'audio/webm');
            setResult(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mb-12 animate-[fadeIn_0.5s_ease-out]">
             <div className="text-center mb-8">
                 <h3 className="text-2xl font-bold text-white mb-2">Forensic Transcription</h3>
                 <p className="text-slate-400">Capture and transcribe evidential audio using Gemini 3 Flash.</p>
             </div>

             <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px]">
                 {!result && !isProcessing && (
                     <div className="text-center">
                         <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl transition-all shadow-2xl ${
                                isRecording 
                                ? 'bg-red-500 text-white animate-pulse shadow-red-500/50' 
                                : 'bg-slate-800 text-cyan-400 hover:bg-slate-700 shadow-cyan-900/20'
                            }`}
                         >
                             <IconMicrophone />
                         </button>
                         <p className="mt-6 text-slate-300 font-medium">
                             {isRecording ? "Recording Evidence..." : "Tap to Record"}
                         </p>
                     </div>
                 )}

                 {isProcessing && (
                      <div className="flex flex-col items-center">
                          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
                          <p className="text-cyan-400 animate-pulse">Transcribing Audio...</p>
                      </div>
                 )}

                 {result && (
                     <div className="w-full text-left space-y-4">
                         <div className="flex items-center justify-between mb-2">
                             <span className="text-xs uppercase tracking-widest text-slate-500">Detected Language: {result.detected_language}</span>
                             <button onClick={() => setResult(null)} className="text-xs text-cyan-400 hover:text-cyan-300">New Recording</button>
                         </div>
                         <div className="p-6 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap shadow-inner">
                             {result.transcript}
                         </div>
                         {result.summary && (
                             <div className="p-4 bg-cyan-900/10 border border-cyan-900/30 rounded-lg">
                                 <h4 className="text-cyan-500 text-xs font-bold uppercase mb-1">Summary</h4>
                                 <p className="text-cyan-100/80 text-sm">{result.summary}</p>
                             </div>
                         )}
                     </div>
                 )}
             </div>
        </div>
    );
}

export default Transcriber;
