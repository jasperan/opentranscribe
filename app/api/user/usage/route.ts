import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserUsage } from '@/lib/db/users';

export async function GET() {
  try {
    const user = await requireAuth();
    const usage = getUserUsage(user.id);

    return NextResponse.json({
      ...usage,
      tier: user.tier,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get usage' },
      { status: 500 }
    );
  }
}
