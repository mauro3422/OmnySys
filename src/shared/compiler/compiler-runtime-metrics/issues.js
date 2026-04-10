/**
 * @fileoverview Issue summary helpers for runtime/compiler metrics.
 *
 * @module shared/compiler/compiler-runtime-metrics-issues
 */

import { getPipelineOrphanSummary } from '../pipeline-orphans.js';
import { getDeadCodePlausibilitySummary } from '../dead-code-reporting.js';
import {
  auditWatcherIssues,
  countOrphanedWatcherIssues,
  getWatcherLifecycleDistribution,
  loadRecentWatcherIssues
} from '../../../core/meta-detector/pipeline-integrity-detector-helpers.js';

export function collectIssueMetrics(db, options = {}) {
  if (!db) {
    return {
      total: 0,
      activeWatcherIssues: 0,
      bySeverity: [],
      display: '0 items',
      orphanCount: 0,
      pipelineOrphanCount: 0,
      watcherIssuePersistence: {
        activeIssueCount: 0,
        recentIssueCount: 0,
        withoutLifecycle: 0,
        withoutContext: 0,
        orphanedIssues: 0,
        lifecycleDistribution: {
          active: 0,
          expired: 0,
          superseded: 0
        }
      },
      suspiciousDeadCandidates: 0
    };
  }

  const { minDeadCodeLines = 5 } = options;
  const recentWatcherIssues = loadRecentWatcherIssues(db);
  const watcherAudit = auditWatcherIssues(recentWatcherIssues);
  const watcherOrphanedIssues = countOrphanedWatcherIssues(db);
  const watcherLifecycleDistribution = getWatcherLifecycleDistribution(db);
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
  const activeWatcherIssueCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM semantic_issues
    WHERE message LIKE '[watcher]%'
      AND (is_removed = 0 OR is_removed IS NULL)
  `).get().count;

  return {
    total: rows.reduce((sum, row) => sum + row.count, 0),
    activeWatcherIssues: activeWatcherIssueCount,
    bySeverity: rows,
    display: rows.map((row) => `${row.count} ${row.severity}`).join(', ') || '0 items',
    orphanCount: orphanSummary?.total || 0,
    pipelineOrphanCount: orphanSummary?.total || 0,
    pipelineOrphanSummary: orphanSummary,
    watcherIssuePersistence: {
      activeIssueCount: activeWatcherIssueCount,
      recentIssueCount: recentWatcherIssues.length,
      withoutLifecycle: watcherAudit.withoutLifecycle || 0,
      withoutContext: watcherAudit.withoutContext || 0,
      orphanedIssues: watcherOrphanedIssues,
      lifecycleDistribution: watcherLifecycleDistribution
    },
    suspiciousDeadCandidates: deadCodeSummary?.suspiciousDeadCandidates || 0,
    deadCodeWarning: deadCodeSummary?.warning || null
  };
}
