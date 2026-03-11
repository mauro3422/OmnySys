/**
 * @fileoverview Canonical runtime/compiler metric snapshots backed by SQLite.
 *
 * @module shared/compiler/compiler-runtime-metrics
 */

import { getPipelineOrphanSummary } from './pipeline-orphans.js';
import { getDeadCodePlausibilitySummary } from './dead-code-utils.js';
import { getFileUniverseGranularity } from './file-universe-granularity.js';
import { getLiveFileTotal } from './live-row-utils.js';

export function getAtomCountSummary(db) {
  if (!db) {
    return {
      totalAtoms: 0,
      byType: {},
      callable: { functions: 0, methods: 0, arrows: 0 },
      display: {
        inventory: 'classes=0, functions=0, variables=0',
        callable: 'functions=0, methods=0, arrows=0'
      }
    };
  }

  const rows = db.prepare(`
    SELECT atom_type, COUNT(*) as count
    FROM atoms
    WHERE (is_removed = 0 OR is_removed IS NULL)
    GROUP BY atom_type
  `).all();

  const byType = rows.reduce((acc, row) => {
    acc[row.atom_type] = row.count;
    return acc;
  }, {});

  return {
    totalAtoms: rows.reduce((sum, row) => sum + row.count, 0),
    byType,
    callable: {
      functions: byType.function || 0,
      methods: byType.method || 0,
      arrows: byType.arrow || 0
    },
    display: {
      inventory: [
        `classes=${byType.class || 0}`,
        `functions=${byType.function || 0}`,
        `variables=${byType.variable || 0}`
      ].join(', '),
      callable: [
        `functions=${byType.function || 0}`,
        `methods=${byType.method || 0}`,
        `arrows=${byType.arrow || 0}`
      ].join(', ')
    }
  };
}

export function getPhase2FileCounts(db) {
  if (!db) {
    return {
      pendingFiles: 0,
      completedFiles: 0,
      liveFileCount: 0
    };
  }

  return {
    pendingFiles: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 0').get()?.n || 0,
    completedFiles: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 1').get()?.n || 0,
    liveFileCount: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_removed IS NULL OR is_removed = 0').get()?.n || 0
  };
}

export function getGraphCoverageSummary(db) {
  if (!db) {
    return {
      callLinks: 0,
      semanticLinks: 0
    };
  }

  const calledByRows = db.prepare(`
    SELECT called_by_json
    FROM atoms
    WHERE (is_removed = 0 OR is_removed IS NULL)
      AND called_by_json IS NOT NULL
      AND called_by_json != '[]'
  `).all();

  return {
    callLinks: calledByRows.reduce((sum, row) => {
      try {
        return sum + (JSON.parse(row.called_by_json)?.length || 0);
      } catch {
        return sum;
      }
    }, 0),
    semanticLinks: db.prepare(`
      SELECT COUNT(*) as n
      FROM atom_relations
      WHERE (is_removed = 0 OR is_removed IS NULL)
        AND relation_type IN ('shares_state', 'emits', 'listens')
    `).get()?.n || 0
  };
}

export function getIssueSummary(db, options = {}) {
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

export function getConceptualDuplicateSummary(repo, options = {}) {
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

export function getFileUniverseSummary(db) {
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

export function summarizeWatcherNoise(stats = {}) {
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

function buildMcpSessionSummaryText({
  hasRuntimeSessionCount,
  runtimeSessionCount,
  totalPersistentActive,
  uniqueClients,
  clientsWithDuplicates
}) {
  return [
    hasRuntimeSessionCount ? `${runtimeSessionCount} runtime` : null,
    `${totalPersistentActive} persistent active`,
    `${uniqueClients} client${uniqueClients === 1 ? '' : 's'}`,
    clientsWithDuplicates > 0
      ? `${clientsWithDuplicates} duplicate client bucket${clientsWithDuplicates === 1 ? '' : 's'}`
      : 'no duplicate client buckets'
  ].filter(Boolean).join(', ');
}

export function getMcpSessionSummary(sessionManager, options = {}) {
  const hasRuntimeSessionCount = Number.isFinite(options.runtimeSessionCount);
  const runtimeSessionCount = hasRuntimeSessionCount ? options.runtimeSessionCount : null;
  const empty = {
    runtimeSessions: runtimeSessionCount,
    totalPersistent: 0,
    totalPersistentActive: 0,
    uniqueClients: 0,
    clientsWithDuplicates: 0,
    duplicateDetails: [],
    multiClientChurn: false,
    summary: runtimeSessionCount > 0
      ? `${runtimeSessionCount} runtime session(s), session persistence unavailable`
      : 'No active MCP sessions'
  };

  if (!sessionManager?.getDedupStats || !sessionManager?.getAllSessions) {
    return empty;
  }

  const dedupStats = sessionManager.getDedupStats();
  if (!dedupStats || dedupStats.error) {
    return {
      ...empty,
      error: dedupStats?.error || 'session summary unavailable'
    };
  }

  const totalPersistent = sessionManager.getAllSessions(false).length;
  const totalPersistentActive = sessionManager.getAllSessions(true).length;
  const uniqueClients = dedupStats.uniqueClients || 0;
  const clientsWithDuplicates = dedupStats.clientsWithDuplicates || 0;
  const duplicateDetails = dedupStats.duplicateDetails || [];
  const multiClientChurn = uniqueClients > 1 || clientsWithDuplicates > 0 || runtimeSessionCount > uniqueClients;

  return {
    runtimeSessions: runtimeSessionCount,
    totalPersistent,
    totalPersistentActive,
    uniqueClients,
    clientsWithDuplicates,
    duplicateDetails,
    multiClientChurn,
    summary: buildMcpSessionSummaryText({
      hasRuntimeSessionCount,
      runtimeSessionCount,
      totalPersistentActive,
      uniqueClients,
      clientsWithDuplicates
    })
  };
}
