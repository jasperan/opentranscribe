/**
 * API Key Database Operations
 */

import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const API_KEY_PREFIX = 'vbt_';

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  name: string | null;
  last_used_at: string | null;
  created_at: string;
}

// Hash API key for storage
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Generate API key with prefix
function generateApiKey(): string {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `${API_KEY_PREFIX}${randomPart}`;
}

export function createApiKey(
  userId: string,
  name?: string
): { id: string; key: string; keyInfo: { id: string; name: string; prefix: string; createdAt: string; lastUsed: string | null } } {
  const db = getDb();
  const id = uuidv4();
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO api_keys (id, user_id, key_hash, name, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, userId, keyHash, name || null, createdAt);

  // Return the plain key ONCE - it cannot be retrieved later
  return {
    id,
    key,
    keyInfo: {
      id,
      name: name || '',
      prefix: key.substring(0, 12),
      createdAt,
      lastUsed: null,
    },
  };
}

export function getApiKeyById(id: string): ApiKey | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as ApiKey | undefined;
}

export function verifyApiKey(
  key: string
): { valid: boolean; userId?: string; keyId?: string; error?: string } {
  // Quick validation of format
  if (!key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const db = getDb();
  const keyHash = hashApiKey(key);

  const apiKey = db
    .prepare('SELECT * FROM api_keys WHERE key_hash = ?')
    .get(keyHash) as ApiKey | undefined;

  if (!apiKey) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Update last used timestamp
  db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    apiKey.id
  );

  return { valid: true, userId: apiKey.user_id, keyId: apiKey.id };
}

export function getUserApiKeys(userId: string): Array<{ id: string; name: string; prefix: string; createdAt: string; lastUsed: string | null }> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, last_used_at, created_at, key_hash
       FROM api_keys
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(userId) as Array<{ id: string; name: string | null; last_used_at: string | null; created_at: string; key_hash: string }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name || '',
    prefix: `vbt_${row.key_hash.substring(0, 8)}`,
    createdAt: row.created_at,
    lastUsed: row.last_used_at,
  }));
}

export function deleteApiKey(id: string, userId?: string): boolean {
  const db = getDb();
  const result = userId
    ? db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(id, userId)
    : db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);

  return result.changes > 0;
}

export function renameApiKey(
  id: string,
  userId: string,
  name: string
): boolean {
  const db = getDb();
  const result = db
    .prepare('UPDATE api_keys SET name = ? WHERE id = ? AND user_id = ?')
    .run(name, id, userId);

  return result.changes > 0;
}

export function countUserApiKeys(userId: string): number {
  const db = getDb();
  const result = db
    .prepare('SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?')
    .get(userId) as { count: number };

  return result.count;
}

// Maximum API keys per user
const MAX_API_KEYS_PER_USER = 10;

export function canCreateApiKey(userId: string): boolean {
  return countUserApiKeys(userId) < MAX_API_KEYS_PER_USER;
}
