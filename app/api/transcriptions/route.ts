import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserTranscriptions } from '@/lib/db/transcriptions';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const transcriptions = getUserTranscriptions(user.id);

    return NextResponse.json({ transcriptions });
  } catch (error) {
    console.error('Transcriptions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcriptions' },
      { status: 500 }
    );
  }
}
