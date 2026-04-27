'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Clock,
  FileText,
  Sparkles,
  Languages,
  Copy,
  Check
} from 'lucide-react';

interface Segment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

interface TranscriptionViewProps {
  text: string;
  segments: Segment[];
  showSpeakers?: boolean;
  onTimestampClick?: (time: number) => void;
}

type TabType = 'transcript' | 'summary' | 'translation';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Keep diarization labels distinct enough for quick transcript scanning.
const speakerStyles: Record<string, { text: string; bg: string; border: string }> = {
  'Speaker 1': { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/25' },
  'Speaker 2': { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  'Speaker 3': { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  'Speaker 4': { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  'Speaker 5': { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  'Speaker 6': { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
};

const defaultStyle = { text: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };

function getSpeakerStyle(speaker: string) {
  return speakerStyles[speaker] || defaultStyle;
}

export default function TranscriptionView({
  text,
  segments,
  showSpeakers = false,
  onTimestampClick,
}: TranscriptionViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'transcript' as const, label: 'Transcript', icon: FileText, disabled: false },
    { id: 'summary' as const, label: 'Summary', icon: Sparkles, disabled: true },
    { id: 'translation' as const, label: 'Translation', icon: Languages, disabled: true },
  ];

  // Group consecutive segments by speaker for better visual grouping
  const groupedSegments = useMemo(() => {
    if (!showSpeakers) return segments.map(s => ({ ...s, isFirstInGroup: true }));

    return segments.map((segment, index) => {
      const prevSegment = segments[index - 1];
      const isFirstInGroup = !prevSegment || prevSegment.speaker !== segment.speaker;
      return { ...segment, isFirstInGroup };
    });
  }, [segments, showSpeakers]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-secondary/50 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!tab.disabled) setActiveTab(tab.id);
                }}
                disabled={tab.disabled}
                aria-disabled={tab.disabled}
                className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  isActive
                    ? 'text-primary-foreground'
                    : tab.disabled
                      ? 'cursor-not-allowed text-muted-foreground/55'
                      : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary rounded-md"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.disabled && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Soon
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="bg-secondary/30 border border-border rounded-xl overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'transcript' && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-h-[500px] overflow-y-auto scrollbar-dark"
            >
              <div className="p-4 space-y-1">
                {groupedSegments.map((segment, index) => {
                  const style = segment.speaker ? getSpeakerStyle(segment.speaker) : defaultStyle;

                  return (
                    <div
                      key={index}
                      className={`group rounded-lg transition-colors hover:bg-accent/30 ${
                        segment.isFirstInGroup && showSpeakers ? 'mt-4 first:mt-0' : ''
                      }`}
                    >
                      {/* Speaker label - only show for first segment in group */}
                      {showSpeakers && segment.speaker && segment.isFirstInGroup && (
                        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} border ${style.border}`}>
                            <User className="w-3 h-3" />
                            {segment.speaker}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3 px-3 py-2">
                        {/* Timestamp */}
                        <button
                          onClick={() => onTimestampClick?.(segment.start)}
                          className="flex items-center gap-1 text-xs text-muted-foreground font-mono min-w-[60px] hover:text-primary transition-colors"
                          title="Click to seek"
                        >
                          <Clock className="w-3 h-3" />
                          {formatTime(segment.start)}
                        </button>

                        {/* Text */}
                        <p className={`text-sm flex-1 leading-relaxed ${
                          showSpeakers && segment.speaker ? 'text-foreground' : ''
                        }`}>
                          {segment.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Summary</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Generate an AI-powered summary of your transcription.
                  This feature analyzes the content and provides key points.
                </p>
                <button className="mt-6 btn-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Summary
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'translation' && (
            <motion.div
              key="translation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Languages className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Translation</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Translate your transcription into another language.
                  Supports multiple languages including Spanish, French, German, and more.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <select className="bg-secondary border border-border rounded-lg px-4 py-2 text-sm">
                    <option value="">Select language...</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                  </select>
                  <button className="btn-primary flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    Translate
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
