import { NextResponse } from 'next/server';
import { requireUserOr401 } from '@/lib/api/guards';
import { getUserUsage } from '@/lib/db/users';

export async function GET() {
  try {
    const auth = await requireUserOr401();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const usage = getUserUsage(user.id);

    return NextResponse.json({
      ...usage,
      tier: user.tier,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to get usage' },
      { status: 500 }
    );
  }
}
