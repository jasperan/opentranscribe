import React, { useRef, useState } from 'react';
import { Upload, FileAudio, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
  onError: (msg: string) => void;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onFileSelect, disabled, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Accept common audio formats
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/m4a', 'audio/webm'];
    const validExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.webm'];

    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType && !hasValidExtension) {
      onError('Invalid file type. Please upload an audio file (MP3, WAV, OGG, FLAC, M4A, or WebM).');
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

  const handleNativeFileSelect = async () => {
    if (disabled) return;

    // Use Electron's native file dialog if available
    if (window.electronAPI) {
      const filePath = await window.electronAPI.showOpenDialog();
      if (filePath) {
        const fileData = await window.electronAPI.readFile(filePath);
        // Create a File object from the data
        const byteCharacters = atob(fileData.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const file = new File([byteArray], fileData.fileName, { type: fileData.mimeType });

        if (validateFile(file)) {
          onFileSelect(file);
        }
      }
    } else {
      // Fallback to input click
      fileInputRef.current?.click();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full p-10 border-2 border-dashed rounded-2xl transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer
        ${isDragging
          ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
          : 'border-[var(--border)] bg-[var(--bg-secondary)]'}
        ${disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-[var(--accent-hover)] hover:bg-[var(--bg-elevated)]'}
      `}
      onClick={handleNativeFileSelect}
      data-testid="audio-uploader"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept=".mp3,.wav,.ogg,.flac,.m4a,.webm,audio/*"
        className="hidden"
        disabled={disabled}
        data-testid="file-input"
      />

      <motion.div
        className={`p-4 rounded-full bg-[var(--bg-elevated)] mb-4 ${disabled ? 'text-[var(--text-muted)]' : 'text-[var(--accent)]'}`}
        animate={{ scale: isDragging ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Upload size={32} />
      </motion.div>

      <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">
        {isDragging ? 'Drop it here!' : 'Upload Audio File'}
      </h3>
      <p className="text-[var(--text-secondary)] text-sm max-w-xs mb-4">
        Supports MP3, WAV, OGG, FLAC, M4A, and WebM. Drag and drop or click to browse.
      </p>

      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-elevated)] rounded-full border border-[var(--border)]">
        <FileAudio size={14} className="text-[var(--accent)]" />
        <span className="text-xs font-medium text-[var(--text-secondary)]">Audio Files</span>
      </div>
    </motion.div>
  );
};

export default AudioUploader;
