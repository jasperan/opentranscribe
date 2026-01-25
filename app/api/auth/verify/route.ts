import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLinkAndCreateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const result = await verifyMagicLinkAndCreateSession(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user?.id,
        email: result.user?.email,
        tier: result.user?.tier,
      },
    });
  } catch (error) {
    console.error('Verify magic link error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
