/**
 * Development-only endpoint to get magic link tokens for testing
 * This endpoint is only available in development mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMagicLink } from '@/lib/db/sessions';

export async function POST(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Create magic link and return the token directly (dev only!)
    const { token } = createMagicLink(email.trim().toLowerCase());
    const verifyUrl = `http://localhost:3000/verify?token=${token}`;

    return NextResponse.json({
      success: true,
      email,
      token,
      verifyUrl,
      message: 'DEV ONLY: Use this URL to complete authentication',
    });
  } catch (error) {
    console.error('Dev magic link error:', error);
    return NextResponse.json(
      { error: 'Failed to create magic link' },
      { status: 500 }
    );
  }
}
