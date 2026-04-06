/**
 * @fileoverview Genealogy Validator
 *
 * Validates that the atom archive (atom-history.db) has complete genealogical
 * coverage for atoms in the operational database. Detects missing genealogy,
 * orphaned archive rows, and incomplete genealogical fields.
 *
 * @module layer-c-memory/storage/governance/genealogy-validator
 */

import { getAtomHistoryDbPath } from '../../../shared/compiler/compiler-persistence-paths.js';
import { getRepository } from '../repository/index.js';
import { createLogger } from '../../../utils/logger.js';
import { existsSync } from 'fs';

const logger = createLogger('OmnySys:GenealogyValidator');

/**
 * Required genealogical fields that should be present in archive rows
 */
const REQUIRED_GENEALOGICAL_FIELDS = [
  'id', 'name', 'file_path', 'atom_type',
  'calls', 'calledBy',
  'dna', 'dataFlow', 'errorFlow', 'performance',
  'complexity', 'fragilityScore', 'cohesionScore',
  'archetype', 'purpose',
  'isExported', 'isAsync'
];

/**
 * Validates genealogy completeness
 */
export async function validateGenealogy(projectPath) {
  const repo = getRepository(projectPath);
  const archivePath = getAtomHistoryDbPath(projectPath);

  if (!repo?.db) {
    return { healthy: false, error: 'Repository database not available' };
  }

  if (!existsSync(archivePath)) {
    return {
      healthy: true,
      archiveExists: false,
      message: 'No archive yet — will be created on first atom modification or Phase 2 run',
      atomsWithoutGenealogy: 0,
      orphanedArchiveRows: 0,
      completenessPct: 0
    };
  }

  try {
    const Database = (await import('better-sqlite3')).default;
    const archiveDb = new Database(archivePath, { readonly: true });

    // Count atoms in operational DB
    const operationalAtoms = repo.db.prepare(`
      SELECT id, file_path, name FROM atoms
      WHERE (is_removed IS NULL OR is_removed = 0)
    `).all();

    // Count unique atoms in archive
    const archiveAtoms = archiveDb.prepare(`
      SELECT DISTINCT atom_id FROM atom_versions_archive
    `).all().map(r => r.atom_id);

    const archiveAtomSet = new Set(archiveAtoms);

    // Find atoms without any archive entry
    const atomsWithoutGenealogy = operationalAtoms.filter(atom => {
      return !archiveAtomSet.has(atom.id);
    });

    // Find orphaned archive rows (archive atoms not in operational DB)
    const operationalAtomIds = new Set(operationalAtoms.map(a => a.id));
    const allArchiveAtomIds = archiveDb.prepare(`
      SELECT DISTINCT atom_id FROM atom_versions_archive
    `).all().map(r => r.atom_id);

    const orphanedArchiveRows = allArchiveAtomIds.filter(id => !operationalAtomIds.has(id));

    // Validate genealogical field completeness in archive
    const fieldCompleteness = archiveDb.prepare(`
      SELECT
        COUNT(*) as total_rows,
        SUM(CASE WHEN payload_json IS NULL OR payload_json = 'null' THEN 1 ELSE 0 END) as null_payload,
        SUM(CASE WHEN version_hash IS NULL OR version_hash = '' THEN 1 ELSE 0 END) as null_hash
      FROM atom_versions_archive
    `).get();

    // Check source distribution
    const sourceDistribution = archiveDb.prepare(`
      SELECT source, COUNT(*) as cnt,
        ROUND(CAST(COUNT(*) AS FLOAT) / (SELECT COUNT(*) FROM atom_versions_archive) * 100, 1) as pct
      FROM atom_versions_archive
      GROUP BY source
      ORDER BY cnt DESC
    `).all();

    archiveDb.close();

    const totalAtoms = operationalAtoms.length;
    const atomCoveragePct = totalAtoms > 0
      ? Math.round(((totalAtoms - atomsWithoutGenealogy.length) / totalAtoms) * 1000) / 10
      : 0;

    // Healthy if:
    // 1. Archive has entries for atoms that have been modified
    // 2. No null payloads
    // 3. Source distribution is reasonable (no event-bulk-handler spam)
    const hasEventBulkSpam = sourceDistribution.some(s => s.source === 'event-bulk-handler' && s.cnt > 1000);
    const healthy = fieldCompleteness.null_payload === 0 && !hasEventBulkSpam;

    return {
      healthy,
      archiveExists: true,
      totalAtoms,
      atomsWithGenealogy: totalAtoms - atomsWithoutGenealogy.length,
      atomsWithoutGenealogy: atomsWithoutGenealogy.length,
      atomCoveragePct,
      orphanedArchiveAtoms: orphanedArchiveRows.length,
      orphanedArchiveRows: orphanedArchiveRows.slice(0, 20),
      fieldCompleteness: {
        totalRows: fieldCompleteness.total_rows,
        nullPayload: fieldCompleteness.null_payload,
        nullHash: fieldCompleteness.null_hash
      },
      sourceDistribution,
      issues: [
        atomsWithoutGenealogy.length > totalAtoms * 0.5
          ? { type: 'low_coverage', message: `${atomsWithoutGenealogy.length}/${totalAtoms} atoms have no genealogy (${100 - atomCoveragePct}% uncovered)` }
          : null,
        orphanedArchiveRows.length > 0
          ? { type: 'orphaned_archives', message: `${orphanedArchiveRows.length} archive atom IDs not found in operational DB` }
          : null,
        fieldCompleteness.null_payload > 0
          ? { type: 'null_payloads', message: `${fieldCompleteness.null_payload} archive rows have null payload_json` }
          : null,
        hasEventBulkSpam
          ? { type: 'event_bulk_spam', message: 'event-bulk-handler is archiving excessively — this is a bug' }
          : null
      ].filter(Boolean),
      recommendations: [
        atomsWithoutGenealogy.length > totalAtoms * 0.5
          ? 'Run Phase 2 to enrich atoms and create initial genealogy entries'
          : null,
        orphanedArchiveRows.length > 0
          ? 'Run archive cleanup to remove orphaned rows'
          : null,
        hasEventBulkSpam
          ? 'Fix event-bulk-handler to NOT archive to atom-history.db'
          : null
      ].filter(Boolean)
    };
  } catch (error) {
    logger.warn(`Failed to validate genealogy: ${error.message}`);
    return { healthy: false, error: error.message };
  }
}
