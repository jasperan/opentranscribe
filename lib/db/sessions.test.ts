import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getDb, resetDb, closeDb } from './index';
import { createMagicLink, countRecentMagicLinks } from './sessions';

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

test('countRecentMagicLinks counts links created just now (same-day rows)', () => {
  const email = 'Rate@Example.com';
  for (let i = 0; i < 3; i++) {
    createMagicLink(email);
  }
  assert.equal(countRecentMagicLinks(email, 1), 3);
});

test('countRecentMagicLinks ignores links older than the window', () => {
  const email = 'old@example.com';
  createMagicLink(email);
  getDb()
    .prepare(`UPDATE magic_links SET created_at = datetime('now', '-2 hours')`)
    .run();
  assert.equal(countRecentMagicLinks(email, 1), 0);
});
