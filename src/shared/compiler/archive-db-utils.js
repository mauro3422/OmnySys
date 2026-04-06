/**
 * @fileoverview Shared archive database utilities for compiler history archives.
 *
 * Provides parameterized helpers for archive DB setup that both
 * `compiler-health-archive.js` and `atom-history-archive.js` can share.
 */

import { mkdirSync, existsSync } from 'fs';
import { getCompilerHistoryDir } from './compiler-persistence-paths.js';

/**
 * Ensure the compiler history directory exists.
 */
export function ensureArchiveDirectory(projectPath) {
  const archiveDir = getCompilerHistoryDir(projectPath);
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }
  return archiveDir;
}

/**
 * Apply standard SQLite pragmas to an archive database.
 * @param {import('better-sqlite3').Database} db
 * @param {object} opts
 * @param {number} [opts.cacheSize=16000]
 */
export function applyArchiveDbConfig(db, opts = {}) {
  const cacheSize = opts.cacheSize ?? 16000;
  db.pragma('journal_mode = WAL');
  db.pragma(`cache_size = ${cacheSize}`);
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('busy_timeout = 5000');
}
