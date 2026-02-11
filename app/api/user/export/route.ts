import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById } from '@/lib/db/users';
import { getUserTranscriptions, getTranscriptionStats } from '@/lib/db/transcriptions';
import { getUserApiKeys } from '@/lib/db/api-keys';

export async function GET() {
  try {
    const user = await requireAuth();

    const fullUser = getUserById(user.id);
    const transcriptions = getUserTranscriptions(user.id, 10000, 0);
    const apiKeys = getUserApiKeys(user.id);
    const stats = getTranscriptionStats(user.id);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: fullUser?.id,
        email: fullUser?.email,
        tier: fullUser?.tier,
        minutesUsed: fullUser?.minutes_used,
        minutesLimit: fullUser?.minutes_limit,
        createdAt: fullUser?.created_at,
        lastActiveAt: fullUser?.last_active_at,
      },
      stats,
      transcriptions: transcriptions.map((t) => ({
        id: t.id,
        filename: t.filename,
        status: t.status,
        modelUsed: t.model_used,
        language: t.language,
        durationSeconds: t.duration_seconds,
        minutesCharged: t.minutes_charged,
        hasDiarization: t.has_diarization,
        resultText: t.result_text,
        resultSegments: t.result_segments ? JSON.parse(t.result_segments) : null,
        createdAt: t.created_at,
      })),
      apiKeys: apiKeys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        createdAt: k.createdAt,
        lastUsed: k.lastUsed,
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="verbatim-data-export.json"',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    console.error('Export user data error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
