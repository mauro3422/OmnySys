/**
 * @fileoverview file-deps-surface.js
 * Canonical surface for file-level dependency graph.
 *
 * Source of truth: file_dependencies table (4,542 rows)
 * Control plane field: FileDeps
 *
 * Tracks import/export relationships between files at the file level
 * (complementary to atom_relations which tracks function-level calls).
 */

/**
 * Loads file dependencies summary.
 * @param {object} db - SQLite database connection
 * @returns {object} File deps summary
 */
export function loadFileDependencies(db) {
  // Overall stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_deps,
      COUNT(DISTINCT source_file) as unique_sources,
      COUNT(DISTINCT target_file) as unique_targets
    FROM file_dependencies
  `).get();

  // Most imported files (most depended upon)
  const mostImported = db.prepare(`
    SELECT target_file as file, COUNT(*) as imported_by_count
    FROM file_dependencies
    GROUP BY target_file
    ORDER BY imported_by_count DESC
    LIMIT 20
  `).all();

  // Most importing files (most dependent)
  const mostDependent = db.prepare(`
    SELECT source_file as file, COUNT(*) as imports_count
    FROM file_dependencies
    GROUP BY source_file
    ORDER BY imports_count DESC
    LIMIT 20
  `).all();

  // Circular dependencies (files that import each other)
  const circularDeps = db.prepare(`
    SELECT a.source_file, a.target_file
    FROM file_dependencies a
    INNER JOIN file_dependencies b ON a.target_file = b.source_file AND a.source_file = b.target_file
    WHERE a.source_file < a.target_file
    GROUP BY a.source_file, a.target_file
    LIMIT 50
  `).all();

  // By import type
  const byType = db.prepare(`
    SELECT import_type, COUNT(*) as count
    FROM file_dependencies
    WHERE import_type IS NOT NULL
    GROUP BY import_type
    ORDER BY count DESC
  `).all();

  return {
    state: 'canonical',
    sourceTable: 'file_dependencies',
    rowCount: stats?.total_deps || 0,
    stats: stats || {},
    mostImported: mostImported || [],
    mostDependent: mostDependent || [],
    circularDependencies: circularDeps || [],
    byType: byType || [],
    summary: buildFileDepsSummary(stats, circularDeps)
  };
}

function buildFileDepsSummary(stats, circularDeps) {
  if (!stats || stats.total_deps === 0) return 'file_deps=none';
  const circularCount = circularDeps?.length || 0;
  return `file_deps=${stats.total_deps}edges/${stats.unique_sources}sources/${stats.unique_targets}targets | ${circularCount}circular`;
}

/**
 * Gets file deps control plane status.
 * @param {object} db - SQLite database connection
 * @returns {object} Control plane file deps status
 */
export function getFileDepsControlPlaneStatus(db) {
  const deps = loadFileDependencies(db);

  if (deps.rowCount === 0) {
    return {
      state: 'missing',
      reason: 'No file dependencies recorded',
      recommendation: 'File dependencies are extracted during Layer A analysis.'
    };
  }

  return {
    state: deps.rowCount > 100 ? 'ready' : 'watching',
    totalDeps: deps.rowCount,
    uniqueSourceFiles: deps.stats?.unique_sources || 0,
    uniqueTargetFiles: deps.stats?.unique_targets || 0,
    circularDepCount: deps.circularDependencies?.length || 0,
    summary: deps.summary
  };
}

export default { loadFileDependencies, getFileDepsControlPlaneStatus };
