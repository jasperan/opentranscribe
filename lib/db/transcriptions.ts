/**
 * Transcription Database Operations
 */

import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';

export interface Transcription {
  id: string;
  user_id: string;
  filename: string;
  duration_seconds: number | null;
  minutes_charged: number | null;
  model_used: string | null;
  language: string | null;
  has_diarization: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_text: string | null;
  result_segments: string | null; // JSON string
  audio_fingerprint: string | null;
  error_message: string | null;
  created_at: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface CompleteTranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  model: string;
  language: string;
  durationSeconds: number;
  minutesCharged: number;
  hasDiarization: boolean;
  audioFingerprint?: string | null;
}

export function createTranscription(
  userId: string,
  filename: string,
  fingerprint?: string
): Transcription {
  const db = getDb();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO transcriptions (id, user_id, filename, audio_fingerprint, status)
     VALUES (?, ?, ?, ?, 'pending')`
  ).run(id, userId, filename, normalizeFingerprint(fingerprint));

  return getTranscriptionById(id)!;
}

// Raw DB row type before boolean conversion
interface TranscriptionRow extends Omit<Transcription, 'has_diarization'> {
  has_diarization: number;
}

function rowToTranscription(row: TranscriptionRow): Transcription {
  return { ...row, has_diarization: Boolean(row.has_diarization) };
}

function normalizeFingerprint(
  fingerprint: string | null | undefined
): string | null {
  const trimmed = fingerprint?.trim();
  return trimmed ? trimmed : null;
}

export function getTranscriptionById(id: string): Transcription | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM transcriptions WHERE id = ?').get(id) as TranscriptionRow | undefined;
  if (!row) return null;
  return rowToTranscription(row);
}

export function getUserTranscriptions(
  userId: string,
  limit = 50,
  offset = 0
): Transcription[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM transcriptions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(userId, limit, offset) as TranscriptionRow[];

  return rows.map(rowToTranscription);
}

export function getUserTranscriptionById(
  userId: string,
  id: string
): Transcription | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM transcriptions
       WHERE user_id = ? AND id = ?`
    )
    .get(userId, id) as TranscriptionRow | undefined;

  if (!row) return null;
  return rowToTranscription(row);
}

export function updateTranscriptionStatus(
  id: string,
  status: Transcription['status'],
  errorMessage?: string
): void {
  const db = getDb();

  if (errorMessage) {
    db.prepare(
      `UPDATE transcriptions SET status = ?, error_message = ? WHERE id = ?`
    ).run(status, errorMessage, id);
  } else {
    db.prepare(`UPDATE transcriptions SET status = ? WHERE id = ?`).run(
      status,
      id
    );
  }
}

export function completeTranscription(
  id: string,
  result: CompleteTranscriptionResult
): void {
  const db = getDb();

  db.prepare(
    `UPDATE transcriptions
     SET status = 'completed',
         result_text = ?,
         result_segments = ?,
         model_used = ?,
         language = ?,
         duration_seconds = ?,
         minutes_charged = ?,
         has_diarization = ?,
         audio_fingerprint = COALESCE(?, audio_fingerprint)
     WHERE id = ?`
  ).run(
    result.text,
    JSON.stringify(result.segments),
    result.model,
    result.language,
    result.durationSeconds,
    result.minutesCharged,
    result.hasDiarization ? 1 : 0,
    normalizeFingerprint(result.audioFingerprint),
    id
  );
}

export function finalizeTranscription(
  userId: string,
  id: string,
  result: CompleteTranscriptionResult
): void {
  const db = getDb();

  const finalize = db.transaction(() => {
    const user = db
      .prepare('SELECT minutes_used, minutes_limit FROM users WHERE id = ?')
      .get(userId) as { minutes_used: number; minutes_limit: number } | undefined;

    if (!user) {
      throw new Error('User not found');
    }

    if (user.minutes_limit !== -1) {
      const remaining = user.minutes_limit - user.minutes_used;
      if (remaining < result.minutesCharged) {
        throw new Error(
          `Insufficient minutes. ${remaining} remaining, ${result.minutesCharged} required.`
        );
      }
    }

    const transcription = db
      .prepare('SELECT user_id FROM transcriptions WHERE id = ?')
      .get(id) as { user_id: string } | undefined;

    if (!transcription || transcription.user_id !== userId) {
      throw new Error('Transcription not found');
    }

    db.prepare(
      'UPDATE users SET minutes_used = minutes_used + ? WHERE id = ?'
    ).run(result.minutesCharged, userId);

    db.prepare(
      `UPDATE transcriptions
       SET status = 'completed',
           result_text = ?,
           result_segments = ?,
           model_used = ?,
           language = ?,
           duration_seconds = ?,
           minutes_charged = ?,
           has_diarization = ?,
           audio_fingerprint = COALESCE(?, audio_fingerprint),
           error_message = NULL
       WHERE id = ?`
    ).run(
      result.text,
      JSON.stringify(result.segments),
      result.model,
      result.language,
      result.durationSeconds,
      result.minutesCharged,
      result.hasDiarization ? 1 : 0,
      normalizeFingerprint(result.audioFingerprint),
      id
    );
  });

  finalize();
}

export function deleteTranscription(id: string, userId: string): boolean {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM transcriptions WHERE id = ? AND user_id = ?')
    .run(id, userId);

  return result.changes > 0;
}

export function findByFingerprint(
  userId: string,
  fingerprint: string
): Transcription | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM transcriptions
       WHERE user_id = ? AND audio_fingerprint = ? AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(userId, fingerprint) as TranscriptionRow | undefined;

  if (!row) return null;
  return rowToTranscription(row);
}

export function getTranscriptionCount(userId: string): number {
  const db = getDb();
  const result = db
    .prepare('SELECT COUNT(*) as count FROM transcriptions WHERE user_id = ?')
    .get(userId) as { count: number };

  return result.count;
}

export function getTranscriptionStats(userId: string): {
  total: number;
  completed: number;
  failed: number;
  totalMinutes: number;
} {
  const db = getDb();

  const stats = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
         COALESCE(SUM(minutes_charged), 0) as total_minutes
       FROM transcriptions
       WHERE user_id = ?`
    )
    .get(userId) as {
    total: number;
    completed: number;
    failed: number;
    total_minutes: number;
  };

  return {
    total: stats.total,
    completed: stats.completed,
    failed: stats.failed,
    totalMinutes: stats.total_minutes,
  };
}
