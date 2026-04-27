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
  Check,
  Radio,
  UploadCloud,
  SlidersHorizontal,
  ShieldCheck,
  FileText,
  Download,
  Activity,
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

const workflowSteps = [
  { label: 'Upload', icon: UploadCloud },
  { label: 'Transcribe', icon: Sparkles },
  { label: 'Review', icon: FileText },
  { label: 'Export', icon: Download },
];

const exportFormats = ['TXT', 'SRT', 'VTT', 'DOCX', 'JSON', 'MD'];

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }
  return `${mins}m ${secs}s`;
}

function ModeButton({
  active,
  icon: Icon,
  label,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof FileAudio;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={active}
      className={`relative rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
        active
          ? 'border-primary/55 bg-primary/10 text-foreground'
          : 'border-border bg-card hover:border-primary/30 hover:bg-accent/50'
      }`}
    >
      {active && (
        <motion.span
          layoutId="mode-active-ring"
          className="absolute inset-0 rounded-2xl ring-1 ring-primary/40"
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        />
      )}
      <span className="relative flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-semibold">{label}</span>
          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{description}</span>
        </span>
      </span>
    </button>
  );
}

function DiarizationSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Speaker diarization</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Identify speakers in interviews and meetings. This uses 2x minutes.
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle speaker diarization"
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors ${
            enabled ? 'border-primary bg-primary' : 'border-border bg-muted'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function ProcessingState({
  status,
  fileName,
}: {
  status: TranscriptionStatus;
  fileName?: string;
}) {
  const progress = status === 'uploading' ? '42%' : '84%';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-10"
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.5rem] border border-primary/25 bg-primary/10">
            <motion.div
              className="absolute inset-2 rounded-[1.25rem] border border-primary/25"
              animate={{ scale: [1, 1.08, 1], opacity: [0.65, 0.2, 0.65] }}
              transition={{ repeat: Infinity, duration: 1.7, ease: 'easeInOut' }}
            />
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {status === 'uploading' ? 'Securing upload' : 'Building transcript'}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {fileName || 'Processing your audio file'}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-background/70 p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{status === 'uploading' ? 'Transfer progress' : 'Model progress'}</span>
            <span className="font-mono font-semibold text-primary">{progress}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: progress }}
              transition={{ duration: status === 'uploading' ? 1.6 : 10, ease: 'easeOut' }}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {workflowSteps.slice(0, 3).map((step, index) => {
              const Icon = step.icon;
              const isActive =
                (status === 'uploading' && index === 0) ||
                (status === 'transcribing' && index === 1);
              const isDone = status === 'transcribing' && index === 0;

              return (
                <div
                  key={step.label}
                  className={`rounded-xl border p-3 text-sm ${
                    isActive || isDone
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  <Icon className="mb-2 h-4 w-4" />
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AppPage() {
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [enableDiarization, setEnableDiarization] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);

  const handleTranscribe = useCallback(
    async (file: File) => {
      setCurrentFile(file);
      setError(null);
      setStatus('uploading');

      try {
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

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Transcription link',
          url: shareUrl,
        });
        return;
      } catch {
        // Fall back to clipboard when native share is cancelled or unavailable.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API not available.
    }
  }, [result]);

  const handleLiveSave = useCallback((_text: string) => {
    // Live transcription history persistence is not wired yet.
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
            <Activity className="h-4 w-4" />
            Transcription desk
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Convert audio into a reviewable transcript.
          </h1>
          <p className="mt-3 max-w-[64ch] leading-relaxed text-muted-foreground">
            Upload a file or record live audio, then review timestamps, speakers, and exports from the same workspace.
          </p>
        </div>

        <UsageMeter />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card overflow-hidden rounded-[1.5rem]">
          <div className="border-b border-border bg-card px-5 py-4 sm:px-6">
            <div
              className="grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Transcription input mode"
            >
              <ModeButton
                active={inputMode === 'file'}
                icon={FileAudio}
                label="File upload"
                description="Best for podcasts, calls, voice memos, and edited audio."
                onClick={() => setInputMode('file')}
              />
              <ModeButton
                active={inputMode === 'live'}
                icon={Mic}
                label="Live recording"
                description="Capture notes from the microphone as the session unfolds."
                onClick={() => setInputMode('live')}
              />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {inputMode === 'live' && (
              <div className="space-y-5">
                <LiveTranscription
                  onSave={handleLiveSave}
                />
              </div>
            )}

            {inputMode === 'file' && status === 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <DiarizationSwitch
                  enabled={enableDiarization}
                  onToggle={() => setEnableDiarization(!enableDiarization)}
                />
                <AudioUploader onFileSelect={handleTranscribe} />
              </motion.div>
            )}

            {inputMode === 'file' && (status === 'uploading' || status === 'transcribing') && (
              <ProcessingState status={status} fileName={currentFile?.name} />
            )}

            {inputMode === 'file' && status === 'success' && result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Transcription complete</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <FileAudio className="h-3.5 w-3.5" />
                          {currentFile?.name}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(result.duration)}
                        </span>
                        <span className="rounded-full bg-background px-2.5 py-1 font-mono text-xs text-primary">
                          {result.minutesCharged} min charged
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleShare}
                      className="btn-secondary inline-flex items-center gap-2"
                      title="Share transcription"
                    >
                      {linkCopied ? (
                        <>
                          <Check className="h-4 w-4 text-primary" />
                          Link copied
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4" />
                          Share
                        </>
                      )}
                    </button>
                    <button onClick={handleReset} className="btn-ghost inline-flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      New transcription
                    </button>
                  </div>
                </div>

                {currentFile && (
                  <AudioPlayer
                    ref={audioPlayerRef}
                    audioFile={currentFile}
                    onTimeUpdate={() => {
                      // Future hook for current segment highlighting.
                    }}
                  />
                )}

                <TranscriptionView
                  text={result.text}
                  segments={result.segments}
                  showSpeakers={enableDiarization}
                  onTimestampClick={handleTimestampClick}
                />

                <div className="flex items-center justify-between border-t border-border pt-4">
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
        </section>

        <aside className="space-y-6">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Workflow state</h2>
              {status === 'error' ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="space-y-3">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isComplete =
                  status === 'success' ||
                  (status === 'transcribing' && index === 0) ||
                  (status === 'uploading' && index === 0);
                const isActive =
                  (status === 'idle' && index === 0) ||
                  (status === 'uploading' && index === 0) ||
                  (status === 'transcribing' && index === 1) ||
                  (status === 'success' && index >= 2);

                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      isActive || isComplete
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border bg-background/60'
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isComplete ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {isComplete ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{step.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {index === 0 && 'Accept and validate audio'}
                        {index === 1 && 'Run selected model'}
                        {index === 2 && 'Check timestamps and speakers'}
                        {index === 3 && 'Download usable formats'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold">Export formats</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Keep review, captions, and archives in sync from one transcript.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {exportFormats.map((format) => (
                <div key={format} className="rounded-lg border border-border bg-background/70 px-3 py-2 text-center font-mono text-sm">
                  {format}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Radio className="h-4 w-4" />
              Live mode
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Switch to live recording when you need running notes before a file is ready.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
