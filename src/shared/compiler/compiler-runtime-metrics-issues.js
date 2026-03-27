/**
 * @fileoverview Issue summary helpers for runtime/compiler metrics.
 *
 * @module shared/compiler/compiler-runtime-metrics-issues
 */

import { getPipelineOrphanSummary } from './pipeline-orphans.js';
import { getDeadCodePlausibilitySummary } from './dead-code-reporting.js';

export function collectIssueMetrics(db, options = {}) {
  if (!db) {
    return {
      total: 0,
      bySeverity: [],
      display: '0 items',
      orphanCount: 0,
      suspiciousDeadCandidates: 0
    };
  }

  const { minDeadCodeLines = 5 } = options;
  const rows = db.prepare(`
    SELECT severity, COUNT(*) as count
    FROM semantic_issues
    WHERE (is_removed = 0 OR is_removed IS NULL)
      AND (lifecycle_status = 'active' OR lifecycle_status IS NULL)
    GROUP BY severity
    ORDER BY severity
  `).all();

  const orphanSummary = getPipelineOrphanSummary(db);
  const deadCodeSummary = getDeadCodePlausibilitySummary(db, { minLines: minDeadCodeLines });

  return {
    total: rows.reduce((sum, row) => sum + row.count, 0),
    bySeverity: rows,
    display: rows.map((row) => `${row.count} ${row.severity}`).join(', ') || '0 items',
    orphanCount: orphanSummary?.total || 0,
    suspiciousDeadCandidates: deadCodeSummary?.suspiciousDeadCandidates || 0,
    deadCodeWarning: deadCodeSummary?.warning || null
  };
}
