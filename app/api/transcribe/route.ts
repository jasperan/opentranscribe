import { NextRequest, NextResponse } from 'next/server';
import { requireUserOr401 } from '@/lib/api/guards';
import { canTranscribe } from '@/lib/db/users';
import {
  createTranscription,
  finalizeTranscription,
  updateTranscriptionStatus,
} from '@/lib/db/transcriptions';
import { MAX_UPLOAD_SIZE_BYTES } from '@/lib/constants';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireUserOr401();
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = auth.user;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const diarization = formData.get('diarization') === 'true';
    const model = formData.get('model') as string | null;
    const language = formData.get('language') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/flac', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
    const allowedExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'];
    const fileExtension = file.name ? '.' + file.name.split('.').pop()?.toLowerCase() : '';
    const isValidType = allowedTypes.includes(file.type) || file.type.startsWith('audio/');
    const isValidExtension = allowedExtensions.includes(fileExtension);

    if (!isValidType && !isValidExtension) {
      return NextResponse.json(
        { error: 'File must be an audio file (MP3, WAV, FLAC, OGG, M4A, AAC)' },
        { status: 400 }
      );
    }

    // Validate file size (max 500MB)
    const maxSize = MAX_UPLOAD_SIZE_BYTES;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500MB.' },
        { status: 400 }
      );
    }

    // M14: Conservative pre-check (actual charge uses real audio duration from backend)
    // Use 0.5 min/MB as safe lower bound to avoid over-blocking users
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedMinutes = Math.max(1, Math.ceil(fileSizeMB * 0.5));
    const minutesToCharge = diarization ? estimatedMinutes * 2 : estimatedMinutes;

    // Check if user can transcribe
    const canProcess = canTranscribe(user.id, minutesToCharge);
    if (!canProcess.allowed) {
      return NextResponse.json(
        { error: canProcess.reason || 'Insufficient minutes' },
        { status: 402 }
      );
    }

    // Create transcription record
    const transcription = createTranscription(user.id, file.name);

    try {
      // Update status to processing
      updateTranscriptionStatus(transcription.id, 'processing');

      // Forward to FastAPI
      const fastApiFormData = new FormData();
      fastApiFormData.append('file', file);
      if (model) fastApiFormData.append('model', model);
      if (language) fastApiFormData.append('language', language);

      const endpoint = diarization ? '/diarize' : '/transcribe';
      const response = await fetch(`${FASTAPI_URL}${endpoint}`, {
        method: 'POST',
        body: fastApiFormData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Transcription service error');
      }

      const result = await response.json();

      // Calculate actual minutes charged based on audio duration
      const audioDuration = result.audio_duration || 0;
      const actualMinutes = Math.ceil(audioDuration / 60);
      const finalMinutesCharged = diarization ? actualMinutes * 2 : actualMinutes;

      // Save completion and charge actual minutes in one database transaction.
      finalizeTranscription(user.id, transcription.id, {
        text: result.text,
        segments: result.segments || [],
        model: result.model,
        language: result.language,
        durationSeconds: Math.round(audioDuration),
        minutesCharged: finalMinutesCharged,
        hasDiarization: diarization,
        audioFingerprint: result.fingerprint ?? null,
      });

      return NextResponse.json({
        id: transcription.id,
        text: result.text,
        segments: result.segments || [],
        model: result.model,
        language: result.language,
        duration: audioDuration,
        minutesCharged: finalMinutesCharged,
        fingerprint: result.fingerprint ?? null,
      });
    } catch (err) {
      // Mark transcription as failed
      updateTranscriptionStatus(
        transcription.id,
        'failed',
        err instanceof Error ? err.message : 'Unknown error'
      );
      throw err;
    }
  } catch (error) {
    console.error('Transcription error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    );
  }
}
