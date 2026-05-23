import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getDb, resetDb, closeDb } from './index';
import { createUser, getUserById } from './users';
import {
  createTranscription,
  finalizeTranscription,
  getTranscriptionById,
} from './transcriptions';

let tempDir = '';

test.beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'verbatim-db-'));
  process.env.DATABASE_PATH = path.join(tempDir, 'verbatim.db');
  resetDb();
});

test.afterEach(() => {
  closeDb();
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
});

test('finalizeTranscription charges usage and completes in one transaction', () => {
  const user = createUser('atomic-complete@example.com');
  const transcription = createTranscription(user.id, 'meeting.mp3');

  finalizeTranscription(user.id, transcription.id, {
    text: 'Ship the recorder.',
    segments: [{ start: 0, end: 1.2, text: 'Ship the recorder.' }],
    model: 'faster-whisper',
    language: 'en',
    durationSeconds: 73,
    minutesCharged: 2,
    hasDiarization: false,
  });

  const updatedUser = getUserById(user.id);
  const completed = getTranscriptionById(transcription.id);

  assert.equal(updatedUser?.minutes_used, 2);
  assert.equal(completed?.status, 'completed');
  assert.equal(completed?.minutes_charged, 2);
  assert.equal(completed?.result_text, 'Ship the recorder.');
});

test('finalizeTranscription rolls back when actual minutes exceed the remaining balance', () => {
  const user = createUser('atomic-rollback@example.com');
  const transcription = createTranscription(user.id, 'long-call.mp3');
  getDb()
    .prepare('UPDATE users SET minutes_used = 499, minutes_limit = 500 WHERE id = ?')
    .run(user.id);

  assert.throws(
    () =>
      finalizeTranscription(user.id, transcription.id, {
        text: 'This should not be saved.',
        segments: [],
        model: 'faster-whisper',
        language: 'en',
        durationSeconds: 120,
        minutesCharged: 2,
        hasDiarization: false,
      }),
    /Insufficient minutes/
  );

  const updatedUser = getUserById(user.id);
  const unchanged = getTranscriptionById(transcription.id);

  assert.equal(updatedUser?.minutes_used, 499);
  assert.equal(unchanged?.status, 'pending');
  assert.equal(unchanged?.minutes_charged, null);
  assert.equal(unchanged?.result_text, null);
});
