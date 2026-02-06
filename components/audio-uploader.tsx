'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Music,
  AlertCircle,
  Headphones,
  Mic2,
  Radio,
  FileAudio,
} from 'lucide-react';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  maxSizeMB?: number;
}

const ACCEPTED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/flac',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
];

const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'];

const audioExamples = [
  { icon: Mic2, label: 'Interviews' },
  { icon: Headphones, label: 'Podcasts' },
  { icon: Radio, label: 'Meetings' },
  { icon: FileAudio, label: 'Voice memos' },
];

export default function AudioUploader({
  onFileSelect,
  disabled = false,
  maxSizeMB = 500,
}: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const isValidType = ACCEPTED_TYPES.some((type) =>
      file.type.includes(type.split('/')[1])
    );
    const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!isValidType && !hasValidExtension) {
      return `Invalid file type. Accepted formats: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File too large. Maximum size: ${maxSizeMB}MB`;
    }

    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFile]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? 'rgb(var(--color-primary))' : 'rgb(var(--color-border))',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`upload-zone relative overflow-hidden ${
          isDragging ? 'upload-zone-active' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Animated background gradient on drag */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5"
            />
          )}
        </AnimatePresence>

        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleChange}
          disabled={disabled}
          aria-label="Upload audio file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />

        <div className="relative flex flex-col items-center text-center py-4">
          {/* Animated icon container */}
          <motion.div
            animate={{
              scale: isDragging ? 1.1 : 1,
              rotate: isDragging ? [0, -5, 5, 0] : 0,
            }}
            transition={{ duration: 0.3 }}
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
              isDragging ? 'bg-primary/20' : 'bg-primary/10'
            }`}
          >
            <AnimatePresence mode="wait">
              {isDragging ? (
                <motion.div
                  key="music"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Music className="w-10 h-10 text-primary" />
                </motion.div>
              ) : selectedFile ? (
                <motion.div
                  key="file"
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <FileAudio className="w-10 h-10 text-primary" />
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Upload className="w-10 h-10 text-primary" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <h3 className="text-xl font-semibold mb-2">
            {isDragging
              ? 'Drop your audio file'
              : selectedFile
                ? selectedFile.name
                : 'Upload audio file'}
          </h3>

          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            {isDragging
              ? 'Release to start transcription'
              : selectedFile
                ? formatFileSize(selectedFile.size)
                : 'Drag and drop your audio file here, or click to browse'}
          </p>

          {/* Supported formats */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {ACCEPTED_EXTENSIONS.map((ext) => (
              <span
                key={ext}
                className="px-3 py-1.5 bg-secondary/80 rounded-full text-xs font-medium uppercase tracking-wider"
              >
                {ext.replace('.', '')}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="w-full max-w-xs flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">Works great with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Audio type examples */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-md">
            {audioExamples.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-xs text-muted-foreground"
              >
                <Icon className="w-4 h-4 text-primary/70" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Max file size: {maxSizeMB}MB
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
