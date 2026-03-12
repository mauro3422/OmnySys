/**
 * @fileoverview Supporting runtime/compiler metric helpers.
 *
 * @module shared/compiler/compiler-runtime-metrics-support
 */

import { getPipelineOrphanSummary } from './pipeline-orphans.js';
import { getDeadCodePlausibilitySummary } from './dead-code-utils.js';
import { getFileUniverseGranularity } from './file-universe-granularity.js';
import { getLiveFileTotal } from './live-row-utils.js';

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

export function collectConceptualDuplicateMetrics(repo, options = {}) {
  const empty = {
    actionableGroups: 0,
    actionableImplementations: 0,
    rawGroups: 0,
    rawImplementations: 0,
    actionableRatio: 0,
    noiseByClass: {}
  };

  if (!repo) {
    return empty;
  }

  try {
    const conceptualSummary = repo.getConceptualDuplicateStats
      ? repo.getConceptualDuplicateStats(options)
      : repo.findConceptualDuplicates?.(options)?.summary || null;

    if (!conceptualSummary) {
      return empty;
    }

    const actionableGroups = conceptualSummary.actionable?.groupCount || 0;
    const rawGroups = conceptualSummary.raw?.groupCount || 0;

    return {
      actionableGroups,
      actionableImplementations: conceptualSummary.actionable?.implementationCount || 0,
      rawGroups,
      rawImplementations: conceptualSummary.raw?.implementationCount || 0,
      actionableRatio: rawGroups > 0
        ? Number((actionableGroups / rawGroups).toFixed(3))
        : 0,
      noiseByClass: conceptualSummary.noiseByClass || {}
    };
  } catch {
    return empty;
  }
}

export function collectFileUniverseMetrics(db) {
  if (!db) {
    return {
      scannedFileTotal: 0,
      manifestFileTotal: 0,
      liveFileCount: 0,
      zeroAtomFileCount: 0,
      liveCoverageRatio: 0,
      contract: null
    };
  }

  const scannedFileTotal = db.prepare('SELECT COUNT(*) as n FROM compiler_scanned_files').get()?.n || 0;
  const liveFileCount = getLiveFileTotal(db);

  const summary = getFileUniverseGranularity({
    scannedFileTotal,
    manifestFileTotal: scannedFileTotal,
    liveFileCount
  });

  return {
    scannedFileTotal: summary?.scannedFileTotal || 0,
    manifestFileTotal: summary?.manifestFileTotal || 0,
    liveFileCount: summary?.liveFileCount || 0,
    zeroAtomFileCount: summary?.zeroAtomFileCount || 0,
    liveCoverageRatio: summary?.liveCoverageRatio || 0,
    contract: summary?.contract || null
  };
}

export function collectWatcherNoiseMetrics(stats = {}) {
  const startupNoiseSuppressed = stats?.startupNoiseSuppressed || 0;
  const startupSuppressionWindowMs = stats?.startupSuppressionWindowMs || 0;

  return {
    startupNoiseSuppressed,
    startupSuppressionWindowMs,
    summary: startupNoiseSuppressed > 0
      ? `${startupNoiseSuppressed} startup watcher event(s) suppressed`
      : 'No startup watcher noise suppressed'
  };
}
