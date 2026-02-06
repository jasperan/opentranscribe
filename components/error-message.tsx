'use client';

import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'banner' | 'full';
}

export default function ErrorMessage({
  title,
  message,
  onRetry,
  onDismiss,
  variant = 'inline',
}: ErrorMessageProps) {
  // Map raw error codes/messages to user-friendly ones
  const friendlyMessage = getFriendlyMessage(message);

  if (variant === 'full') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-12 text-center"
      >
        <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{title || 'Something went wrong'}</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{friendlyMessage}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        )}
      </motion.div>
    );
  }

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl"
      >
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {title && <p className="text-sm font-medium text-destructive">{title}</p>}
          <p className="text-sm text-destructive/80">{friendlyMessage}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 text-destructive/60 hover:text-destructive transition-colors rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Inline variant
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{friendlyMessage}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium hover:bg-destructive/10 rounded transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-0.5 hover:bg-destructive/10 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}

function getFriendlyMessage(message: string): string {
  const lowered = message.toLowerCase();

  if (lowered.includes('failed to fetch') || lowered.includes('networkerror')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  if (lowered.includes('413') || lowered.includes('too large') || lowered.includes('payload')) {
    return 'The file is too large to upload. Please try a smaller file or compress the audio first.';
  }
  if (lowered.includes('401') || lowered.includes('unauthorized')) {
    return 'Your session has expired. Please sign in again to continue.';
  }
  if (lowered.includes('403') || lowered.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }
  if (lowered.includes('404') || lowered.includes('not found')) {
    return 'The requested resource could not be found. It may have been deleted.';
  }
  if (lowered.includes('429') || lowered.includes('rate limit') || lowered.includes('too many')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (lowered.includes('500') || lowered.includes('internal server')) {
    return 'An unexpected server error occurred. Our team has been notified. Please try again later.';
  }
  if (lowered.includes('timeout') || lowered.includes('timed out')) {
    return 'The request took too long. This may happen with large audio files. Please try again.';
  }
  if (lowered.includes('unsupported') || lowered.includes('invalid file')) {
    return 'This file format is not supported. Please use MP3, WAV, FLAC, OGG, M4A, or AAC.';
  }
  if (lowered.includes('quota') || lowered.includes('limit exceeded')) {
    return 'You have reached your usage limit. Please upgrade your plan or wait for your quota to reset.';
  }

  return message;
}
