/**
 * Shared helpers for Next.js API route handlers.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import type { User } from '@/lib/db/users';

export type GuardResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Resolve the current user or return a 401 response.
 * Lets route handlers bail out with a single early return.
 */
export async function requireUserOr401(): Promise<GuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }
  return { ok: true, user };
}
