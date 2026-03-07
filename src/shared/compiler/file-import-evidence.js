/**
 * @fileoverview Canonical coverage helpers for file-level import evidence.
 *
 * Reachability heuristics should not assume file-level import telemetry is
 * trustworthy unless support-table coverage is broad enough.
 *
 * @module shared/compiler/file-import-evidence
 */

export function getFileImportEvidenceCoverage(db) {
  const row = db.prepare(`
    SELECT
      COUNT(*) as totalFiles,
      SUM(
        CASE
          WHEN imports_json IS NOT NULL
            AND imports_json != ''
            AND imports_json != '[]'
          THEN 1
          ELSE 0
        END
      ) as filesWithImports
    FROM files
  `).get() || {};

  const totalFiles = Number(row.totalFiles || 0);
  const filesWithImports = Number(row.filesWithImports || 0);
  const coverageRatio = totalFiles > 0 ? Number((filesWithImports / totalFiles).toFixed(3)) : 0;

  return {
    totalFiles,
    filesWithImports,
    coverageRatio,
    trustworthy: coverageRatio >= 0.5
  };
}
