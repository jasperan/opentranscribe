
import React, { useRef, useState } from 'react';
import { Upload, FileAudio, AlertCircle } from 'lucide-react';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
  onError: (msg: string) => void;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ onFileSelect, disabled, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check for MP3 by mime type or extension
    const isMp3 = file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3');
    if (!isMp3) {
      onError('Invalid file type. Please upload an MP3 file.');
      return false;
    }
    return true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !disabled && validateFile(file)) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full p-10 border-2 border-dashed rounded-2xl transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer
        ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800/30'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-slate-800/50'}
      `}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept=".mp3,audio/mpeg"
        className="hidden"
        disabled={disabled}
      />
      
      <div className={`p-4 rounded-full bg-slate-800 mb-4 text-blue-400 ${disabled ? 'text-slate-500' : ''}`}>
        <Upload size={32} />
      </div>

      <h3 className="text-xl font-semibold mb-2">
        {isDragging ? 'Drop it here!' : 'Upload MP3 File'}
      </h3>
      <p className="text-slate-400 text-sm max-w-xs mb-4">
        Exclusively for MP3 files. Drag and drop or click to browse.
      </p>
      
      <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700">
        <FileAudio size={14} className="text-purple-400" />
        <span className="text-xs font-medium text-slate-300">MP3 Format Only</span>
      </div>
    </div>
  );
};

export default AudioUploader;
