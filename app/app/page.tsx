'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  Loader2,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  FileAudio,
  Clock,
  Sparkles,
  Share2,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import AudioUploader from '@/components/audio-uploader';
import AudioPlayer, { type AudioPlayerHandle } from '@/components/audio-player';
import TranscriptionView from '@/components/transcription-view';
import ExportMenu from '@/components/export-menu';
import ErrorMessage from '@/components/error-message';
import UsageMeter from '@/components/usage-meter';
import LiveTranscription from '@/components/live-transcription';

type TranscriptionStatus = 'idle' | 'uploading' | 'transcribing' | 'success' | 'error';
type InputMode = 'file' | 'live';

interface TranscriptionResult {
  id: string;
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }>;
  model: string;
  language: string;
  duration: number;
  minutesCharged: number;
}

export default function AppPage() {
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [enableDiarization, setEnableDiarization] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [liveTranscriptionText, setLiveTranscriptionText] = useState('');
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);

  const handleTranscribe = useCallback(
    async (file: File) => {
      setCurrentFile(file);
      setError(null);
      setStatus('uploading');

      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('diarization', enableDiarization.toString());

        setStatus('transcribing');

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Transcription failed');
        }

        setResult(data);
        setStatus('success');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Transcription failed');
        setStatus('error');
      }
    },
    [enableDiarization]
  );

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setCurrentFile(null);
    setError(null);
  };

  const handleTimestampClick = useCallback((time: number) => {
    audioPlayerRef.current?.seekTo(time);
  }, []);

  const handleShare = useCallback(async () => {
    if (!result) return;

    const shareUrl = `${window.location.origin}/app/history?id=${result.id}`;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Transcription: ${currentFile?.name || 'Untitled'}`,
          text: result.text.slice(0, 200) + '...',
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
      }
    }

    // Fall back to copying link
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [result, currentFile]);

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const handleLiveTranscriptionComplete = useCallback((text: string) => {
    setLiveTranscriptionText(text);
  }, []);

  const handleLiveSave = useCallback((_text: string) => {
    // Live transcription history persistence is not wired yet.
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transcribe Audio</h1>
        <p className="text-muted-foreground">
          {inputMode === 'file'
            ? 'Upload an audio file to get a high-accuracy transcription.'
            : 'Speak into your microphone for real-time transcription.'}
        </p>
      </div>

      {/* Usage meter */}
      <div className="mb-8">
        <UsageMeter />
      </div>

      {/* Input mode tabs */}
      <div className="mb-6">
        <div className="flex items-center bg-secondary/50 rounded-lg p-1 w-fit">
          <button
            onClick={() => setInputMode('file')}
            className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              inputMode === 'file'
                ? 'text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {inputMode === 'file' && (
              <motion.div
                layoutId="inputModeTab"
                className="absolute inset-0 bg-primary rounded-md"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <FileAudio className="w-4 h-4" />
              File Upload
            </span>
          </button>
          <button
            onClick={() => setInputMode('live')}
            className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              inputMode === 'live'
                ? 'text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {inputMode === 'live' && (
              <motion.div
                layoutId="inputModeTab"
                className="absolute inset-0 bg-primary rounded-md"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Live Recording
            </span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="card p-6">
        {/* Live transcription mode */}
        {inputMode === 'live' && (
          <LiveTranscription
            onTranscriptionComplete={handleLiveTranscriptionComplete}
            onSave={handleLiveSave}
          />
        )}

        {/* File upload mode */}
        {inputMode === 'file' && status === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Diarization toggle */}
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div>
                <h3 className="font-medium">Speaker Diarization</h3>
                <p className="text-sm text-muted-foreground">
                  Identify who said what (uses 2x minutes)
                </p>
              </div>
              <button
                onClick={() => setEnableDiarization(!enableDiarization)}
                role="switch"
                aria-checked={enableDiarization}
                aria-label="Toggle speaker diarization"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enableDiarization ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enableDiarization ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Upload zone */}
            <AudioUploader onFileSelect={handleTranscribe} />
          </motion.div>
        )}

        {inputMode === 'file' && (status === 'uploading' || status === 'transcribing') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <div className="relative mx-auto w-20 h-20 mb-6">
              <motion.div
                className="absolute inset-0 bg-primary/20 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              />
              <div className="absolute inset-0 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <Mic className="absolute inset-0 m-auto w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {status === 'uploading' ? 'Uploading...' : 'Transcribing...'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {currentFile?.name || 'Processing your audio'}
            </p>

            {/* Progress bar */}
            <div className="max-w-xs mx-auto mb-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: '0%' }}
                  animate={{
                    width: status === 'uploading' ? '40%' : '85%',
                  }}
                  transition={{ duration: status === 'uploading' ? 2 : 15, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {status === 'uploading' ? 'Uploading file...' : 'Processing with AI...'}
              </p>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground mt-6">
              <div className={`flex items-center gap-2 ${status === 'uploading' ? 'text-primary' : 'text-green-500'}`}>
                {status === 'uploading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Upload
              </div>
              <div className="w-8 h-px bg-border" />
              <div className={`flex items-center gap-2 ${status === 'transcribing' ? 'text-primary' : 'text-muted-foreground'}`}>
                {status === 'transcribing' ? (
                  <Sparkles className="w-4 h-4 animate-pulse" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Transcribe
              </div>
              <div className="w-8 h-px bg-border" />
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Done
              </div>
            </div>
          </motion.div>
        )}

        {inputMode === 'file' && status === 'success' && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Success header with metadata */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Transcription complete</h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <FileAudio className="w-3.5 h-3.5" />
                      {currentFile?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(result.duration)}
                    </span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      {result.minutesCharged} min charged
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="btn-ghost flex items-center gap-2"
                  title="Share transcription"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-green-500">Link copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Share
                    </>
                  )}
                </button>
                <button onClick={handleReset} className="btn-ghost flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  New transcription
                </button>
              </div>
            </div>

            {/* Audio player */}
            {currentFile && (
              <AudioPlayer
                ref={audioPlayerRef}
                audioFile={currentFile}
                onTimeUpdate={(time) => {
                  // Could highlight current segment in transcript
                }}
              />
            )}

            {/* Transcription result */}
            <TranscriptionView
              text={result.text}
              segments={result.segments}
              showSpeakers={enableDiarization}
              onTimestampClick={handleTimestampClick}
            />

            {/* Export options */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <ExportMenu transcriptionId={result.id} filename={currentFile?.name} />
            </div>
          </motion.div>
        )}

        {inputMode === 'file' && status === 'error' && (
          <ErrorMessage
            title="Transcription failed"
            message={error || 'An unknown error occurred'}
            variant="full"
            onRetry={handleReset}
          />
        )}
      </div>
    </div>
  );
}
