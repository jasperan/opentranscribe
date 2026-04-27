import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserTranscriptions } from '@/lib/db/transcriptions';
import { toTranscriptionDto } from '@/lib/transcriptions/dto';

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const limit = Math.min(
      parsePositiveInteger(request.nextUrl.searchParams.get('limit'), 50),
      100
    );
    const offset = Math.max(
      parsePositiveInteger(request.nextUrl.searchParams.get('offset'), 0),
      0
    );

    const transcriptions = getUserTranscriptions(user.id, limit, offset).map(
      toTranscriptionDto
    );

    return NextResponse.json({ transcriptions });
  } catch (error) {
    console.error('Transcriptions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcriptions' },
      { status: 500 }
    );
  }
}
