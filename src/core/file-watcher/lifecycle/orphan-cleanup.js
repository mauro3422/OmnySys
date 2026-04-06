/**
 * @fileoverview Orphan file cleanup for the file watcher.
 *
 * Periodically marks files as removed in the DB when they no longer exist
 * on disk. This is a safety net for platforms where the filesystem watcher
 * may not emit deletion events reliably (e.g., Windows).
 *
 * Isolated from initialization.js to respect the compiler policy contract:
 * DB access lives in a dedicated service boundary, not mixed with watcher setup.
 */

import path from 'path';
import { existsSync } from 'fs';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:watcher:orphan-cleanup');

/**
 * Scan all active files in the DB and mark missing ones as removed.
 * @param {string} rootPath - Project root path
 * @returns {Promise<{ marked: number, scanned: number }>}
 */
export async function checkOrphanedFiles(rootPath) {
  const repo = getRepository(rootPath);
  if (!repo?.initialized || !repo?.db || repo.db.open === false) {
    return { marked: 0, scanned: 0 };
  }

  const files = repo.db.prepare(
    'SELECT path FROM files WHERE is_removed = 0'
  ).all();

  if (!files || files.length === 0) {
    return { marked: 0, scanned: 0 };
  }

  let marked = 0;
  for (const file of files) {
    const fullPath = path.join(rootPath, file.path);
    if (!existsSync(fullPath)) {
      try {
        repo.db.prepare(
          "UPDATE files SET is_removed = 1, updated_at = datetime('now') WHERE path = ? AND is_removed = 0"
        ).run(file.path);

        repo.db.prepare(
          "UPDATE atoms SET is_removed = 1, updated_at = datetime('now') WHERE file_path = ? AND is_removed = 0"
        ).run(file.path);

        repo.db.prepare(
          "UPDATE atom_relations SET is_removed = 1, updated_at = datetime('now') WHERE file_path = ? AND is_removed = 0"
        ).run(file.path);

        marked++;
      } catch (error) {
        logger.warn(`[ORPHAN MARK FAIL] ${file.path}: ${error.message}`);
      }
    }
  }

  if (marked > 0) {
    logger.info(`[ORPHAN CLEANUP] Marked ${marked}/${files.length} files as removed`);
  }

  return { marked, scanned: files.length };
}
