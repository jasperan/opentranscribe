/**
 * Verbatim Authentication Library
 *
 * Handles magic link authentication and session management.
 */

import { cookies } from 'next/headers';
import {
  createMagicLink,
  verifyMagicLink,
  countRecentMagicLinks,
  createSession,
  verifySession,
  deleteSession,
  extendSession,
} from './db/sessions';
import { getOrCreateUser, getUserById, updateLastActive, User } from './db/users';
import { sendMagicLinkEmail } from './email';
import { getConfig } from './config';

const SESSION_COOKIE_NAME = 'verbatim_session';
const MAGIC_LINK_RATE_LIMIT = (() => { try { return getConfig().auth.rate_limit_magic_links_per_hour; } catch { return 3; } })();

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

/**
 * Send a magic link to the user's email
 */
export async function sendMagicLink(email: string): Promise<AuthResult> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' };
  }

  // Rate limiting
  const recentCount = countRecentMagicLinks(email, 1);
  if (recentCount >= MAGIC_LINK_RATE_LIMIT) {
    return {
      success: false,
      error: 'Too many login attempts. Please try again later.',
    };
  }

  // Create magic link
  const { token } = createMagicLink(email);

  // Send email
  const emailResult = await sendMagicLinkEmail(email, token);
  if (!emailResult.success) {
    return { success: false, error: 'Failed to send email. Please try again.' };
  }

  return { success: true };
}

/**
 * Verify a magic link token and create a session
 */
export async function verifyMagicLinkAndCreateSession(
  token: string
): Promise<AuthResult> {
  const result = verifyMagicLink(token);

  if (!result.valid || !result.email) {
    return { success: false, error: result.error || 'Invalid link' };
  }

  // Get or create user
  const user = getOrCreateUser(result.email);

  // Create session
  const session = createSession(user.id);

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return { success: true, user };
}

/**
 * Get the current authenticated user from session cookie
 */
export async function getCurrentUser(): Promise<User | null> {
  // In development mode, auto-authenticate with a dev user
  // (disabled during E2E testing via DISABLE_DEV_SHORTCUTS)
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DISABLE_DEV_SHORTCUTS !== 'true'
  ) {
    const devUser = getOrCreateUser('dev@localhost');
    return devUser;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const result = verifySession(sessionToken);

  if (!result.valid || !result.userId) {
    return null;
  }

  // Extend session on each request
  if (result.sessionId) {
    extendSession(result.sessionId);
  }

  // Update last active
  updateLastActive(result.userId);

  return getUserById(result.userId);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Log out the current user
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const result = verifySession(sessionToken);
    if (result.sessionId) {
      deleteSession(result.sessionId);
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if request is authenticated (for middleware)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
