/**
 * @fileoverview Archive Duplicate Detector
 *
 * Detects duplicate content rows in atom_versions_archive.
 * Unlike the operational DB duplicate detection (which works on DNA),
 * this works on the archive table directly checking version_hash collisions.
 *
 * @module layer-c-memory/storage/governance/archive-duplicate-detector
 */

import { getAtomHistoryDbPath } from '../../../shared/compiler/compiler-persistence-paths.js';
import { createLogger } from '../../../utils/logger.js';
import { existsSync } from 'fs';

const logger = createLogger('OmnySys:ArchiveDuplicateDetector');

/**
 * Scans atom_versions_archive for duplicate version_hash values per atom_id
 */
export function detectArchiveDuplicates(projectPath) {
  const archivePath = getAtomHistoryDbPath(projectPath);
  if (!existsSync(archivePath)) {
    return { exists: false, duplicateGroups: 0, totalDuplicateRows: 0, spaceWastedBytes: 0, groups: [] };
  }

  try {
    const Database = require('better-sqlite3');
    const db = new Database(archivePath, { readonly: true });

    // Find atoms with multiple rows having the same version_hash
    const duplicateGroups = db.prepare(`
      SELECT
        atom_id,
        version_hash,
        COUNT(*) as row_count,
        GROUP_CONCAT(id, ',') as row_ids,
        GROUP_CONCAT(source, ',') as sources,
        GROUP_CONCAT(captured_at, ',') as timestamps
      FROM atom_versions_archive
      GROUP BY atom_id, version_hash
      HAVING COUNT(*) > 1
      ORDER BY row_count DESC
      LIMIT 100
    `).all();

    // Total duplicate rows (excess copies)
    const totalExcess = db.prepare(`
      SELECT COALESCE(SUM(row_count - 1), 0) as excess
      FROM (
        SELECT atom_id, version_hash, COUNT(*) as row_count
        FROM atom_versions_archive
        GROUP BY atom_id, version_hash
        HAVING COUNT(*) > 1
      )
    `).get();

    // Count atoms with any duplicates
    const atomsWithDuplicates = db.prepare(`
      SELECT COUNT(DISTINCT atom_id) as c
      FROM atom_versions_archive
      WHERE (atom_id, version_hash) IN (
        SELECT atom_id, version_hash
        FROM atom_versions_archive
        GROUP BY atom_id, version_hash
        HAVING COUNT(*) > 1
      )
    `).get();

    // Estimate space wasted (avg payload size * excess rows)
    const avgPayloadSize = db.prepare(`
      SELECT AVG(LENGTH(payload_json)) as avg_size FROM atom_versions_archive
    `).get();

    const spaceWastedBytes = totalExcess.excess * (avgPayloadSize.avg_size || 2000);

    // Also check for fingerprint-level duplicates (should be 0 with correct fingerprint)
    const fingerprintDupes = db.prepare(`
      SELECT COUNT(*) as c FROM atom_versions_archive
      WHERE version_fingerprint IN (
        SELECT version_fingerprint FROM atom_versions_archive
        GROUP BY version_fingerprint HAVING COUNT(*) > 1
      )
    `).get();

    db.close();

    const groups = duplicateGroups.map(g => ({
      atomId: g.atom_id,
      versionHash: g.version_hash,
      rowCount: g.row_count,
      sources: g.sources.split(',').filter((v, i, a) => a.indexOf(v) === i),
      capturedAt: g.timestamps.split(',').slice(0, 3)
    }));

    return {
      exists: true,
      duplicateGroups: duplicateGroups.length,
      totalDuplicateRows: totalExcess.excess,
      atomsWithDuplicates: atomsWithDuplicates.c,
      fingerprintDuplicates: fingerprintDupes.c,
      spaceWastedBytes: Math.round(spaceWastedBytes),
      spaceWastedMB: Math.round(spaceWastedBytes / 1024 / 1024),
      avgPayloadSizeBytes: Math.round(avgPayloadSize.avg_size || 0),
      groups: groups.slice(0, 20),
      healthy: duplicateGroups.length === 0 && fingerprintDupes.c === 0
    };
  } catch (error) {
    logger.warn(`Failed to detect archive duplicates: ${error.message}`);
    return { exists: true, error: error.message, healthy: false };
  }
}

/**
 * Removes duplicate rows from archive, keeping only the latest per (atom_id, version_hash)
 */
export function purgeArchiveDuplicates(projectPath, options = {}) {
  const { dryRun = true } = options;
  const archivePath = getAtomHistoryDbPath(projectPath);
  if (!existsSync(archivePath)) {
    return { success: false, reason: 'archive does not exist' };
  }

  try {
    const Database = require('better-sqlite3');
    const db = new Database(archivePath);

    const before = db.prepare('SELECT COUNT(*) as c FROM atom_versions_archive').get();

    if (dryRun) {
      const dupes = db.prepare(`
        SELECT id, atom_id, version_hash, captured_at, source
        FROM atom_versions_archive
        WHERE id NOT IN (
          SELECT MAX(id) FROM atom_versions_archive GROUP BY atom_id, version_hash
        )
      `).all();

      db.close();

      return {
        success: true,
        dryRun: true,
        rowsToRemove: dupes.length,
        sample: dupes.slice(0, 5)
      };
    }

    // Remove duplicates, keep latest
    db.exec(`
      DELETE FROM atom_versions_archive
      WHERE id NOT IN (
        SELECT MAX(id) FROM atom_versions_archive GROUP BY atom_id, version_hash
      )
    `);

    const after = db.prepare('SELECT COUNT(*) as c FROM atom_versions_archive').get();
    const removed = before.c - after.c;

    // Vacuum to reclaim space
    db.exec('VACUUM');

    const sizeAfter = db.prepare('SELECT page_count * page_size as s FROM pragma_page_count(), pragma_page_size()').get();

    db.close();

    return {
      success: true,
      dryRun: false,
      rowsRemoved: removed,
      sizeAfterMB: Math.round(sizeAfter.s / 1024 / 1024)
    };
  } catch (error) {
    logger.error(`Failed to purge archive duplicates: ${error.message}`);
    return { success: false, error: error.message };
  }
}
