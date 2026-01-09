import React, { useCallback, useRef, useState } from 'react';
import { IconUpload, IconAudioWave, IconEye } from '../constants';
import { AnalysisMode, FileData } from '../types';

interface FileUploadProps {
  mode: AnalysisMode;
  onFileSelect: (data: FileData) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ mode, onFileSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedTypes = mode === AnalysisMode.AUDIO 
    ? "audio/mpeg, audio/wav, audio/x-wav, audio/mp3" 
    : "image/png, image/jpeg, image/jpg";

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = (file: File) => {
    setError(null);
    if (!file) return;

    const isAudio = file.type.startsWith('audio/');
    const isImage = file.type.startsWith('image/');

    if (mode === AnalysisMode.AUDIO && !isAudio) {
      setError("Invalid file type. Please upload an audio file (.mp3, .wav).");
      return;
    }
    if (mode === AnalysisMode.SPECTROGRAM && !isImage) {
      setError("Invalid file type. Please upload an image file (PNG, JPG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = (e.target?.result as string).split(',')[1];
      onFileSelect({
        file,
        previewUrl: URL.createObjectURL(file),
        base64: base64String,
        mimeType: file.type
      });
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [mode, onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <div 
        className={`relative group border-2 border-dashed rounded-xl p-10 transition-all duration-300 ease-in-out
          ${dragActive ? 'border-cyan-400 bg-cyan-900/10' : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50'}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes}
          onChange={handleChange}
        />
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`p-4 rounded-full bg-slate-800 ring-1 ring-slate-700 transition-colors group-hover:ring-cyan-500/50 group-hover:text-cyan-400`}>
             {mode === AnalysisMode.AUDIO ? <IconAudioWave /> : <IconEye />}
          </div>
          
          <div>
            <p className="text-lg font-medium text-slate-200">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-400/30 hover:decoration-cyan-300 underline-offset-4 font-semibold"
              >
                Upload {mode === AnalysisMode.AUDIO ? 'Audio' : 'Spectrogram'}
              </button>
              <span className="text-slate-400"> or drag and drop</span>
            </p>
            <p className="text-sm text-slate-500 mt-2">
              {mode === AnalysisMode.AUDIO ? 'MP3, WAV up to 20MB' : 'PNG, JPG up to 10MB'}
            </p>
          </div>
        </div>

        {error && (
          <div className="absolute -bottom-12 left-0 right-0 text-center">
            <span className="inline-block px-4 py-2 bg-red-900/20 text-red-400 text-sm rounded border border-red-900/50">
              {error}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
