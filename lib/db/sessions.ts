/**
 * Session and Magic Link Database Operations
 */

import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const SESSION_EXPIRY_DAYS = 7;

// Hash tokens for storage (never store plain tokens)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Generate cryptographically secure token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ============ Magic Links ============

export interface MagicLink {
  id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export function createMagicLink(email: string): { id: string; token: string } {
  const db = getDb();
  const id = uuidv4();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000
  ).toISOString();

  db.prepare(
    `INSERT INTO magic_links (id, email, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(id, email.toLowerCase(), tokenHash, expiresAt);

  return { id, token };
}

export function verifyMagicLink(
  token: string
): { valid: boolean; email?: string; error?: string } {
  const db = getDb();
  const tokenHash = hashToken(token);

  const link = db
    .prepare(
      `SELECT * FROM magic_links
       WHERE token_hash = ? AND used_at IS NULL`
    )
    .get(tokenHash) as MagicLink | undefined;

  if (!link) {
    return { valid: false, error: 'Invalid or already used link' };
  }

  if (new Date(link.expires_at) < new Date()) {
    return { valid: false, error: 'Link has expired' };
  }

  // Mark as used
  db.prepare('UPDATE magic_links SET used_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    link.id
  );

  return { valid: true, email: link.email };
}

export function countRecentMagicLinks(email: string, hours: number): number {
  const db = getDb();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const result = db
    .prepare(
      `SELECT COUNT(*) as count FROM magic_links
       WHERE email = ? AND created_at > ?`
    )
    .get(email.toLowerCase(), since) as { count: number };

  return result.count;
}

// Cleanup expired magic links
export function cleanupMagicLinks(): number {
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM magic_links WHERE expires_at < ?`)
    .run(new Date().toISOString());

  return result.changes;
}

// ============ Sessions ============

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export function createSession(userId: string): { id: string; token: string } {
  const db = getDb();
  const id = uuidv4();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(id, userId, tokenHash, expiresAt);

  return { id, token };
}

export function verifySession(
  token: string
): { valid: boolean; userId?: string; sessionId?: string; error?: string } {
  const db = getDb();
  const tokenHash = hashToken(token);

  const session = db
    .prepare(
      `SELECT * FROM sessions WHERE token_hash = ?`
    )
    .get(tokenHash) as Session | undefined;

  if (!session) {
    return { valid: false, error: 'Invalid session' };
  }

  if (new Date(session.expires_at) < new Date()) {
    // Clean up expired session
    db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    return { valid: false, error: 'Session expired' };
  }

  return { valid: true, userId: session.user_id, sessionId: session.id };
}

export function extendSession(sessionId: string): void {
  const db = getDb();
  const newExpiry = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(
    newExpiry,
    sessionId
  );
}

export function deleteSession(sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function deleteAllUserSessions(userId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

// Cleanup expired sessions
export function cleanupSessions(): number {
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM sessions WHERE expires_at < ?`)
    .run(new Date().toISOString());

  return result.changes;
}
