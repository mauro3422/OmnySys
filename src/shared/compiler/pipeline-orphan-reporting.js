/**
 * @fileoverview Canonical reporting helpers for disconnected exported pipeline atoms.
 *
 * Keeps the SQL candidate selection and the remediation summary in one place so
 * MCP metrics and future watcher/compiler diagnostics stop rebuilding it.
 *
 * @module shared/compiler/pipeline-orphan-reporting
 */

import {
  classifyPipelineOrphans,
  getPipelineNamePatternSqlCondition,
  normalizePipelineOrphan
} from './pipeline-orphans.js';

export function getPipelineOrphanCandidates(db, options = {}) {
  const {
    limit = 50,
    minComplexity = 3
  } = options;

  const patternCondition = getPipelineNamePatternSqlCondition('name');

  return db.prepare(`
    SELECT
        a.id,
        a.name,
        a.file_path,
        a.atom_type,
        a.callers_count,
        a.callees_count,
        a.called_by_json,
        a.complexity,
        a.is_phase2_complete,
        (
          SELECT COUNT(*)
          FROM files f
          WHERE f.path != a.file_path
            AND f.imports_json LIKE '%' || a.file_path || '%'
        ) AS file_importer_count
    FROM atoms a
    WHERE a.is_exported = 1
      AND a.atom_type IN ('function', 'arrow', 'method', 'class')
      AND a.is_test_callback = 0
      AND a.is_phase2_complete = 1
      AND a.file_path NOT LIKE 'tests/%'
      AND a.file_path NOT LIKE 'scripts/%'
      AND (${patternCondition})
      AND a.complexity > ?
    ORDER BY a.complexity DESC
    LIMIT ?
  `).all(minComplexity, limit);
}

export function getPipelineOrphanSummary(db, options = {}) {
  const {
    candidateLimit = 50,
    orphanLimit = 20,
    minComplexity = 3
  } = options;

  const candidates = getPipelineOrphanCandidates(db, {
    limit: candidateLimit,
    minComplexity
  });
  const orphans = classifyPipelineOrphans(candidates, { limit: orphanLimit });

  return {
    totalCandidates: candidates.length,
    orphanCount: orphans.length,
    warning: orphans.length > 0
      ? {
          field: 'pipeline_orphans',
          coverage: `${orphans.length} atoms`,
          issue: 'Exported pipeline atoms appear disconnected after filtering import-backed modules'
        }
      : null,
    orphans,
    normalizedOrphans: orphans.map(normalizePipelineOrphan)
  };
}
