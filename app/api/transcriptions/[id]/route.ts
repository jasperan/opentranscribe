import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  deleteTranscription,
  getUserTranscriptionById,
} from '@/lib/db/transcriptions';
import { toTranscriptionDto } from '@/lib/transcriptions/dto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const transcription = getUserTranscriptionById(user.id, id);

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      transcription: toTranscriptionDto(transcription),
    });
  } catch (error) {
    console.error('Get transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcription' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const deleted = deleteTranscription(id, user.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transcription' },
      { status: 500 }
    );
  }
}
