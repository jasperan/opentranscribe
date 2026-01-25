import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { canTranscribe, addMinutesUsed } from '@/lib/db/users';
import {
  createTranscription,
  completeTranscription,
  updateTranscriptionStatus,
} from '@/lib/db/transcriptions';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

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
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'File must be an audio file' },
        { status: 400 }
      );
    }

    // Estimate minutes (rough estimate: 1MB ≈ 1 minute for MP3)
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedMinutes = Math.ceil(fileSizeMB);
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

      // Deduct minutes from user's balance
      addMinutesUsed(user.id, finalMinutesCharged);

      // Save completed transcription
      completeTranscription(transcription.id, {
        text: result.text,
        segments: result.segments || [],
        model: result.model,
        language: result.language,
        durationSeconds: Math.round(audioDuration),
        minutesCharged: finalMinutesCharged,
        hasDiarization: diarization,
      });

      return NextResponse.json({
        id: transcription.id,
        text: result.text,
        segments: result.segments || [],
        model: result.model,
        language: result.language,
        duration: audioDuration,
        minutesCharged: finalMinutesCharged,
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

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    );
  }
}
