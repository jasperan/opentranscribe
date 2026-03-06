/**
 * Verbatim Database Layer
 *
 * SQLite database with better-sqlite3 for synchronous, fast queries.
 * Schema matches PRD Section 6.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

function getDbPath(): string {
  const configPath = process.env.DATABASE_PATH || './data/verbatim.db';
  return path.resolve(process.cwd(), configPath);
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema if needed
  initSchema(db);

  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'creator', 'pro', 'unlimited')),
      minutes_used INTEGER DEFAULT 0,
      minutes_limit INTEGER DEFAULT 500,
      billing_period_start TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_active_at TEXT
    );

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Magic links table
    CREATE TABLE IF NOT EXISTS magic_links (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- API keys table
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash TEXT NOT NULL,
      name TEXT,
      last_used_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Transcriptions table
    CREATE TABLE IF NOT EXISTS transcriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      duration_seconds INTEGER,
      minutes_charged INTEGER,
      model_used TEXT,
      language TEXT,
      has_diarization INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      result_text TEXT,
      result_segments TEXT,
      audio_fingerprint TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Usage logs table
    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      minutes_used INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- User settings table (M15: persist user preferences)
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      default_model TEXT DEFAULT 'faster-whisper',
      default_language TEXT DEFAULT 'auto',
      email_notifications INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Rate limiting table
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      window_start TEXT DEFAULT (datetime('now'))
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token_hash);
    CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
    CREATE INDEX IF NOT EXISTS idx_transcriptions_user ON transcriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
    CREATE INDEX IF NOT EXISTS idx_transcriptions_fingerprint ON transcriptions(audio_fingerprint);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id, created_at);
    -- M6: Composite index for paginated history queries (ORDER BY created_at DESC)
    CREATE INDEX IF NOT EXISTS idx_transcriptions_user_created ON transcriptions(user_id, created_at DESC);
  `);

  // M8: Clean up expired sessions and magic links on startup
  cleanupExpired(database);
}

// M8: Clean up expired sessions and magic links on DB init
function cleanupExpired(database: Database.Database): void {
  const now = new Date().toISOString();
  const sessions = database.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  const links = database.prepare('DELETE FROM magic_links WHERE expires_at < ?').run(now);
  if (sessions.changes > 0 || links.changes > 0) {
    console.log(`DB cleanup: removed ${sessions.changes} expired sessions, ${links.changes} expired magic links`);
  }
}

// Close database connection gracefully
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// For testing - reset database
export function resetDb(): void {
  const dbPath = getDbPath();
  closeDb();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  // Re-initialize
  getDb();
}
