import type {
  Transcription,
  TranscriptionSegment,
} from '@/lib/db/transcriptions';

export interface TranscriptionDto {
  id: string;
  filename: string;
  text: string | null;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }>;
  model: string | null;
  language: string | null;
  duration: number | null;
  minutesCharged: number | null;
  hasDiarization: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage: string | null;
  createdAt: string;
  audioFingerprint: string | null;
  sourceMediaAvailable: boolean;
  sourceMediaKind: 'audio' | 'video' | null;
}

function isValidSegment(
  segment: unknown
): segment is TranscriptionSegment & { speaker?: string } {
  if (!segment || typeof segment !== 'object') {
    return false;
  }

  const candidate = segment as Partial<TranscriptionSegment> & {
    speaker?: unknown;
  };

  return (
    typeof candidate.start === 'number' &&
    Number.isFinite(candidate.start) &&
    typeof candidate.end === 'number' &&
    Number.isFinite(candidate.end) &&
    typeof candidate.text === 'string' &&
    (candidate.speaker === undefined || typeof candidate.speaker === 'string')
  );
}

export function parseTranscriptionSegments(
  rawSegments: string | null
): TranscriptionDto['segments'] {
  if (!rawSegments) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawSegments);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isValidSegment)
      .map(({ start, end, text, speaker }) => ({
        start,
        end,
        text,
        ...(speaker ? { speaker } : {}),
      }));
  } catch {
    return [];
  }
}

export function toTranscriptionDto(
  transcription: Transcription
): TranscriptionDto {
  return {
    id: transcription.id,
    filename: transcription.filename,
    text: transcription.result_text,
    segments: parseTranscriptionSegments(transcription.result_segments),
    model: transcription.model_used,
    language: transcription.language,
    duration: transcription.duration_seconds,
    minutesCharged: transcription.minutes_charged,
    hasDiarization: transcription.has_diarization,
    status: transcription.status,
    errorMessage: transcription.error_message,
    createdAt: transcription.created_at,
    audioFingerprint: transcription.audio_fingerprint,
    sourceMediaAvailable: false,
    sourceMediaKind: null,
  };
}
