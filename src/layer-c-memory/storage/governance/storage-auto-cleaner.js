/**
 * @fileoverview Storage Auto-Cleaner
 *
 * Performs maintenance operations on storage databases:
 * VACUUM, WAL checkpoint, orphan cleanup, duplicate purge.
 * Triggered automatically when anomalies are detected.
 *
 * @module layer-c-memory/storage/governance/storage-auto-cleaner
 */

import { getAtomHistoryDbPath } from '../../../shared/compiler/compiler-persistence-paths.js';
import { getRepository } from '../repository/index.js';
import { createLogger } from '../../../utils/logger.js';
import { existsSync } from 'fs';
import { purgeArchiveDuplicates } from './archive-duplicate-detector.js';

const logger = createLogger('OmnySys:StorageAutoCleaner');

/**
 * Runs VACUUM and WAL checkpoint on omnysys.db
 */
function vacuumOperationalDb(projectPath) {
  try {
    const repo = getRepository(projectPath);
    if (!repo?.db) return { success: false, reason: 'db not available' };

    const before = repo.db.prepare('SELECT page_count * page_size as s FROM pragma_page_count(), pragma_page_size()').get();

    repo.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    repo.db.exec('VACUUM');

    const after = repo.db.prepare('SELECT page_count * page_size as s FROM pragma_page_count(), pragma_page_size()').get();

    const freedBytes = before.s - after.s;
    return {
      success: true,
      sizeBeforeMB: Math.round(before.s / 1024 / 1024),
      sizeAfterMB: Math.round(after.s / 1024 / 1024),
      freedMB: Math.round(freedBytes / 1024 / 1024)
    };
  } catch (error) {
    logger.error(`VACUUM failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Runs VACUUM on atom-history.db
 */
async function vacuumArchiveDb(projectPath) {
  const archivePath = getAtomHistoryDbPath(projectPath);
  if (!existsSync(archivePath)) {
    return { success: false, reason: 'archive does not exist' };
  }

  try {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(archivePath);

    const before = db.prepare('SELECT page_count * page_size as s FROM pragma_page_count(), pragma_page_size()').get();

    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    db.exec('VACUUM');

    const after = db.prepare('SELECT page_count * page_size as s FROM pragma_page_count(), pragma_page_size()').get();

    const freedBytes = before.s - after.s;
    db.close();

    return {
      success: true,
      sizeBeforeMB: Math.round(before.s / 1024 / 1024),
      sizeAfterMB: Math.round(after.s / 1024 / 1024),
      freedMB: Math.round(freedBytes / 1024 / 1024)
    };
  } catch (error) {
    logger.error(`Archive VACUUM failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Removes orphaned archive rows (atoms no longer in operational DB)
 */
async function cleanOrphanedArchives(projectPath) {
  const archivePath = getAtomHistoryDbPath(projectPath);
  if (!existsSync(archivePath)) {
    return { success: false, reason: 'archive does not exist' };
  }

  try {
    const repo = getRepository(projectPath);
    if (!repo?.db) return { success: false, reason: 'operational db not available' };

    const Database = (await import('better-sqlite3')).default;
    const archiveDb = new Database(archivePath);

    // Get valid atom IDs
    const validIds = repo.db.prepare(`
      SELECT id FROM atoms WHERE (is_removed IS NULL OR is_removed = 0)
    `).all().map(r => r.id);

    if (validIds.length === 0) {
      archiveDb.close();
      return { success: true, removed: 0, reason: 'no valid atoms to compare against' };
    }

    const placeholders = validIds.map(() => '?').join(',');
    const stmt = archiveDb.prepare(`
      DELETE FROM atom_versions_archive WHERE atom_id NOT IN (${placeholders})
    `);

    const result = stmt.run(...validIds);
    const removed = result.changes || 0;

    archiveDb.close();

    return { success: true, removed, message: removed > 0 ? `Removed ${removed} orphaned archive rows` : 'No orphaned rows found' };
  } catch (error) {
    logger.error(`Orphan cleanup failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main maintenance function — runs all cleanup operations
 */
export function runStorageMaintenance(projectPath, options = {}) {
  const { dryRun = true, vacuum = true, dedup = true, orphans = true } = options;
  const results = {
    checkedAt: new Date().toISOString(),
    projectPath,
    dryRun,
    operations: {}
  };

  if (vacuum) {
    if (dryRun) {
      results.operations.vacuumOperational = { dryRun: true, message: 'Would run VACUUM on omnysys.db' };
      results.operations.vacuumArchive = { dryRun: true, message: 'Would run VACUUM on atom-history.db' };
    } else {
      results.operations.vacuumOperational = vacuumOperationalDb(projectPath);
      results.operations.vacuumArchive = vacuumArchiveDb(projectPath);
    }
  }

  if (dedup) {
    results.operations.archiveDedup = purgeArchiveDuplicates(projectPath, { dryRun });
  }

  if (orphans && !dryRun) {
    results.operations.orphanCleanup = cleanOrphanedArchives(projectPath);
  } else if (orphans && dryRun) {
    results.operations.orphanCleanup = { dryRun: true, message: 'Would scan and remove orphaned archive rows' };
  }

  return results;
}

export { vacuumOperationalDb, vacuumArchiveDb, cleanOrphanedArchives };
