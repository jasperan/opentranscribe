'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  Sparkles,
  Clock,
  FileText,
  CheckCircle,
} from 'lucide-react';
import LiveRecorder from '@/components/live-recorder';
import UsageMeter from '@/components/usage-meter';

interface SavedTranscription {
  id: string;
  text: string;
  duration: number;
  timestamp: Date;
}

export default function LivePage() {
  const [recentTranscriptions, setRecentTranscriptions] = useState<SavedTranscription[]>([]);
  const [savedNotification, setSavedNotification] = useState(false);

  const handleTranscriptionComplete = useCallback(() => {
    // Streaming transcription completed; state lives in LiveRecorder until Save is clicked.
  }, []);

  const handleSave = useCallback((text: string, duration: number) => {
    const transcription: SavedTranscription = {
      id: Date.now().toString(),
      text,
      duration,
      timestamp: new Date(),
    };

    setRecentTranscriptions(prev => [transcription, ...prev].slice(0, 5));

    // Show saved notification
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2000);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Mic className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Live Transcription</h1>
            <p className="text-muted-foreground">
              Real-time speech-to-text powered by faster-whisper
            </p>
          </div>
        </div>
      </div>

      {/* Usage meter */}
      <div className="mb-8">
        <UsageMeter />
      </div>

      {/* Features highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <div className="text-sm font-medium">Auto-correcting</div>
            <div className="text-xs text-muted-foreground">Text improves as you speak</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <div className="text-sm font-medium">High Accuracy</div>
            <div className="text-xs text-muted-foreground">GPU-accelerated Whisper</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <div className="text-sm font-medium">Voice Detection</div>
            <div className="text-xs text-muted-foreground">Silero VAD integration</div>
          </div>
        </div>
      </div>

      {/* Main recording interface */}
      <div className="card p-6 mb-8">
        <LiveRecorder
          onTranscriptionComplete={handleTranscriptionComplete}
          onSave={handleSave}
        />
      </div>

      {/* Saved notification */}
      {savedNotification && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg"
        >
          <CheckCircle className="w-4 h-4" />
          Transcription saved
        </motion.div>
      )}

      {/* Recent transcriptions */}
      {recentTranscriptions.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Transcriptions</h2>
          <div className="space-y-3">
            {recentTranscriptions.map((transcription) => (
              <motion.div
                key={transcription.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(transcription.timestamp)}</span>
                    <span>|</span>
                    <span>{formatDuration(transcription.duration)}</span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(transcription.text)}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-sm line-clamp-2">{transcription.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 p-4 bg-secondary/30 rounded-lg border border-border">
        <h3 className="font-medium mb-2">Tips for best results</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Use a good microphone and minimize background noise</li>
          <li>Speak clearly at a normal pace</li>
          <li>The &quot;Base&quot; model offers the best balance of speed and accuracy</li>
          <li>Use &quot;Voice Activated&quot; mode for hands-free transcription</li>
          <li>Use &quot;Push to Talk&quot; in noisy environments</li>
        </ul>
      </div>
    </div>
  );
}
