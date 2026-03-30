/**
 * @fileoverview Canonical compiler metrics snapshot and history helpers.
 *
 * Persisted snapshots let OmnySys compare current health, duplicates,
 * folderization and coverage against previous states and baseline windows.
 *
 * @module shared/compiler/compiler-metrics-snapshot
 */

import { createHash } from 'node:crypto';
import { normalizeCount } from './contract-helpers.js';
import { summarizeCompilerDriftAssessment } from './compiler-drift-assessment.js';
import { getGraphCoverageSummary, getIssueSummary, getConceptualDuplicateSummary } from './compiler-runtime-metrics/summary.js';
import { getPhase2PendingFiles } from './compiler-runtime-metrics-db.js';
import { getPipelineOrphanSummary } from './pipeline-orphans.js';
import { normalizeFolderizationPath } from './directory-structure-folderization-data.js';
import { buildPipelineTimingTelemetrySummary } from './pipeline-timing-telemetry.js';
import { buildToolRunTelemetrySummary } from './tool-run-telemetry.js';
import { getValidDnaPredicate, getDuplicateEligiblePredicate } from '#layer-c/storage/repository/utils/duplicate-dna.js';

function normalizeSnapshotPath(value = '') {
  const normalized = normalizeFolderizationPath(value);
  return normalized || null;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampScore(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function parseJson(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildStructuralDuplicateGroups(db) {
  if (!db?.prepare) {
    return 0;
  }

  try {
    const validDna = getValidDnaPredicate();
    const eligible = getDuplicateEligiblePredicate();
    const row = db.prepare(`
      SELECT COUNT(*) as n FROM (
        SELECT dna_json
        FROM atoms
        WHERE ${validDna}
          AND ${eligible}
        GROUP BY dna_json
        HAVING COUNT(*) > 1
      )
    `).get();

    return asNumber(row?.n, 0);
  } catch {
    return 0;
  }
}

function buildSnapshotFingerprint(snapshot) {
  return createHash('sha1')
    .update(JSON.stringify({
      projectPath: snapshot.projectPath,
      snapshotKind: snapshot.snapshotKind,
      scopePath: snapshot.scopePath,
      focusPath: snapshot.focusPath,
      current: snapshot.current
    }))
    .digest('hex')
    .slice(0, 16);
}

function calculateProgressScore(delta = {}, current = {}, previous = null) {
  const weights = {
    healthScore: 1,
    issueCount: -1,
    structuralGroups: -3,
    conceptualGroups: -3,
    pipelineOrphans: -5,
    namingTargets: -0.15,
    flatFamilies: -0.5,
    liveCoverageRatio: 100,
    recentErrorCount: -5,
    recentWarningCount: -1,
    watcherAlertCount: -2,
    phase2PendingFiles: -1,
    alreadyFolderizedFamilies: 0.5
  };

  return Object.entries(weights).reduce((score, [key, weight]) => {
    const value = asNumber(delta[key], 0);
    return score + (value * weight);
  }, 0);
}

function buildTrendSummary(delta = {}) {
  const parts = [];

  const pushPart = (label, value, suffix = '') => {
    if (!Number.isFinite(value) || value === 0) {
      return;
    }

    const signed = value > 0 ? `+${value}` : `${value}`;
    parts.push(`${label} ${signed}${suffix}`);
  };

  pushPart('health', delta.healthScore);
  pushPart('issues', -delta.issueCount);
  pushPart('structural dups', -delta.structuralGroups);
  pushPart('conceptual dups', -delta.conceptualGroups);
  pushPart('orphans', -delta.pipelineOrphans);
  pushPart('naming targets', -delta.namingTargets);
  pushPart('flat families', -delta.flatFamilies);
  pushPart('coverage', Math.round((delta.liveCoverageRatio || 0) * 100), '%');
  pushPart('atoms', delta.activeAtoms);
  pushPart('errors', -delta.recentErrorCount);

  return parts.length > 0 ? parts.join(', ') : 'No measurable change';
}

function normalizeRecentErrors(recentErrors = null) {
  return {
    total: asNumber(recentErrors?.summary?.total, 0),
    warnings: asNumber(recentErrors?.summary?.warnings, 0),
    errors: asNumber(recentErrors?.summary?.errors, 0)
  };
}

function buildActiveAtomsDriftAssessment(current = null, history = null) {
  if (!current) {
    return {
      state: 'missing',
      healthy: false,
      trustworthy: false,
      severity: 'medium',
      reason: 'No active atom snapshot is available.',
      recommendation: 'Capture a compiler metrics snapshot before trusting active atom counts.',
      evidence: null,
      delta: 0,
      deltaPct: 0
    };
  }

  const liveRowSync = current.liveRowSync || null;
  const staleRows = asNumber(liveRowSync?.summary?.staleAtomRows, 0)
    + asNumber(liveRowSync?.summary?.staleFileRows, 0)
    + asNumber(liveRowSync?.summary?.staleRiskRows, 0)
    + asNumber(liveRowSync?.summary?.staleRelationRows, 0)
    + asNumber(liveRowSync?.summary?.staleConnectionRows, 0);
  const previous = history?.previous || null;
  const currentActiveAtoms = asNumber(current.activeAtoms, 0);
  const previousActiveAtoms = asNumber(previous?.activeAtoms, 0);
  const delta = currentActiveAtoms - previousActiveAtoms;
  const deltaPct = previousActiveAtoms > 0 ? Number(((delta / previousActiveAtoms) * 100).toFixed(2)) : 0;

  if (staleRows > 0) {
    return {
      state: 'blocked',
      healthy: false,
      trustworthy: false,
      severity: 'high',
      reason: `Live support tables are drifting from the atom graph (${staleRows} stale row(s)).`,
      recommendation: liveRowSync?.before?.recommendedActions?.[0] || 'Reconcile the live support tables before trusting active atom counts.',
      evidence: liveRowSync,
      delta,
      deltaPct
    };
  }

  if (!previous) {
    return {
      state: 'initial',
      healthy: true,
      trustworthy: true,
      severity: 'low',
      reason: 'First active atom snapshot captured.',
      recommendation: 'Capture another snapshot to establish an active atom baseline.',
      evidence: { activeAtoms: currentActiveAtoms },
      delta,
      deltaPct
    };
  }

  const previousScale = Math.max(1, previousActiveAtoms);
  const blockedThreshold = Math.max(250, Math.round(previousScale * 0.25));
  const staleThreshold = Math.max(50, Math.round(previousScale * 0.1));
  const absDelta = Math.abs(delta);

  if (absDelta >= blockedThreshold) {
    return {
      state: 'blocked',
      healthy: false,
      trustworthy: false,
      severity: 'high',
      reason: `Active atom counts shifted by ${absDelta} since the previous snapshot (${deltaPct >= 0 ? '+' : ''}${deltaPct}%).`,
      recommendation: 'Reconcile the database surfaces before trusting active atom counts.',
      evidence: {
        activeAtoms: currentActiveAtoms,
        previousActiveAtoms,
        delta,
        deltaPct,
        blockedThreshold,
        staleThreshold
      },
      delta,
      deltaPct
    };
  }

  if (absDelta >= staleThreshold) {
    return {
      state: 'stale',
      healthy: false,
      trustworthy: false,
      severity: 'medium',
      reason: `Active atom counts shifted by ${absDelta} since the previous snapshot (${deltaPct >= 0 ? '+' : ''}${deltaPct}%).`,
      recommendation: 'Watch the active atom count for desynchronization before trusting downstream metrics.',
      evidence: {
        activeAtoms: currentActiveAtoms,
        previousActiveAtoms,
        delta,
        deltaPct,
        blockedThreshold,
        staleThreshold
      },
      delta,
      deltaPct
    };
  }

  return {
    state: 'fresh',
    healthy: true,
    trustworthy: true,
    severity: 'low',
    reason: 'Active atom counts remain aligned with the previous snapshot.',
    recommendation: 'Keep the database surfaces and live atom graph aligned.',
    evidence: {
      activeAtoms: currentActiveAtoms,
      previousActiveAtoms,
      delta,
      deltaPct,
      blockedThreshold,
      staleThreshold
    },
    delta,
    deltaPct
  };
}

function buildBehaviorScore(current = {}, trend = {}, driftAssessment = null, pipelineTimingTelemetry = null) {
  const driftSummary = summarizeCompilerDriftAssessment(driftAssessment);
  const performancePenalty = pipelineTimingTelemetry?.performanceState === 'regressing'
    ? 6
    : pipelineTimingTelemetry?.performanceState === 'watchful'
      ? 2
      : 0;
  const dbSyncPenalty = current.activeAtomsDriftState === 'blocked'
    ? 12
    : current.activeAtomsDriftState === 'stale'
      ? 4
      : 0;
  const clientSyncPenalty = current.clientSyncState === 'blocked'
    ? 10
    : current.clientSyncState === 'stale'
      ? 3
      : 0;
  const penalty =
    (asNumber(current.issueCount, 0) * 1.25) +
    (asNumber(current.structuralGroups, 0) * 4.5) +
    (asNumber(current.conceptualGroups, 0) * 4) +
    (asNumber(current.pipelineOrphans, 0) * 5) +
    (asNumber(current.watcherAlertCount, 0) * 2) +
    (asNumber(current.recentWarningCount, 0) * 1) +
    (asNumber(current.recentErrorCount, 0) * 6) +
    (asNumber(current.phase2PendingFiles, 0) * 0.5) +
    (asNumber(current.namingDebt, 0) * 0.02) +
    (asNumber(current.flatFamilies, 0) * 0.05) +
    performancePenalty +
    dbSyncPenalty +
    clientSyncPenalty;

  const coverageBonus = clampScore(asNumber(current.liveCoverageRatio, 0) * 100, 0, 100) * 0.12;
  const trustBonus = current.databaseTrustworthy ? 8 : 0;
  const trendBonus = clampScore(asNumber(trend.progressScore, 0) / 4, -10, 10);
  const driftPenalty = (driftSummary.blocked * 20) + (driftSummary.stale * 10) + (driftSummary.missing * 6) + (driftSummary.partial * 2);

  const stabilityScore = clampScore(100 - penalty + coverageBonus + trustBonus + trendBonus, 0, 100);
  const driftScore = clampScore(100 - driftPenalty, 0, 100);
  const successScore = clampScore(
    (asNumber(current.healthScore, 0) * 0.28) +
    (stabilityScore * 0.27) +
    (driftScore * 0.25) +
    (clampScore(asNumber(current.liveCoverageRatio, 0) * 100, 0, 100) * 0.20),
    0,
    100
  );
  const successThreshold = 85;
  const mvpReady = successScore >= successThreshold
    && current.databaseTrustworthy === true
    && current.recentErrorCount === 0
    && current.structuralGroups === 0
    && current.conceptualGroups === 0
    && current.pipelineOrphans === 0
    && current.watcherAlertCount === 0
    && current.liveCoverageRatio >= 0.98
    && current.activeAtomsDriftState !== 'blocked'
    && current.clientSyncState !== 'blocked'
    && driftSummary.status !== 'blocked';

  const behaviorState = !current.databaseTrustworthy || current.recentErrorCount > 0 || current.activeAtomsDriftState === 'blocked' || current.clientSyncState === 'blocked' || driftSummary.status === 'blocked'
    ? 'blocked'
    : successScore >= successThreshold
      ? 'ready'
      : successScore >= 70
        ? 'watchful'
        : 'noisy';

  const readinessReason = mvpReady
    ? 'System satisfies the current MVP success threshold.'
    : !current.databaseTrustworthy
      ? 'Database trust is still insufficient for MVP readiness.'
      : current.recentErrorCount > 0
        ? 'Recent errors are still active.'
    : current.activeAtomsDriftState === 'blocked'
      ? current.activeAtomsDriftReason || 'Active atom counts are out of sync with the live database surfaces.'
      : current.clientSyncState === 'blocked'
        ? current.clientSyncReason || 'MCP client session sync is blocked.'
        : driftSummary.status === 'blocked'
          ? driftSummary.nextAction || 'Drift surfaces are blocked.'
          : successScore < successThreshold
            ? `Success score ${Math.round(successScore)} is below the ${successThreshold} threshold.`
            : 'System is close, but one or more readiness conditions are not yet satisfied.';

  return {
    driftState: driftSummary.status || 'missing',
    driftScore: Number(driftScore.toFixed(2)),
    stabilityScore: Number(stabilityScore.toFixed(2)),
    successScore: Number(successScore.toFixed(2)),
    successThreshold,
    mvpReady,
    behaviorState,
    readinessReason
  };
}

function buildCurrentMetrics({
  projectPath,
  scopePath,
  focusPath,
  captureSource,
  snapshotKind = 'status',
  compilerExplainability = null,
  repo = null,
  watcherAlerts = [],
  recentErrors = null,
  driftAssessment = null,
  toolRunTelemetryWindowDays = 7,
  phase2PendingFiles = null,
  mcpSessionSummary = null
} = {}) {
  const db = repo?.db || null;
  const graphCoverage = (() => {
    try {
      return db ? getGraphCoverageSummary(db) : { callLinks: 0, semanticLinks: 0 };
    } catch {
      return { callLinks: 0, semanticLinks: 0 };
    }
  })();
  const issueSummary = (() => {
    try {
      return db ? getIssueSummary(db, { minDeadCodeLines: 5 }) : { total: 0 };
    } catch {
      return { total: 0 };
    }
  })();
  const conceptualSummary = (() => {
    try {
      return repo ? getConceptualDuplicateSummary(repo, { limit: 50 }) : {
        actionableGroups: 0,
        actionableImplementations: 0,
        rawGroups: 0,
        rawImplementations: 0
      };
    } catch {
      return {
        actionableGroups: 0,
        actionableImplementations: 0,
        rawGroups: 0,
        rawImplementations: 0
      };
    }
  })();
  const pipelineOrphans = (() => {
    try {
      return db ? getPipelineOrphanSummary(db) : { orphanCount: 0 };
    } catch {
      return { orphanCount: 0 };
    }
  })();
  const folderization = compilerExplainability?.folderization || {};
  const databaseHealth = compilerExplainability?.databaseHealth || null;
  const fileUniverse = compilerExplainability?.fileUniverseGranularity || null;
  const analysisGeneration = compilerExplainability?.analysisGeneration || null;
  const compilerDriftAssessment = driftAssessment || compilerExplainability?.driftAssessment || null;
  const notificationCounts = normalizeRecentErrors(recentErrors);
  const pendingFiles = phase2PendingFiles ?? (() => {
    try {
      return db ? getPhase2PendingFiles(db) : 0;
    } catch {
      return 0;
    }
  })();
  const pipelineTimingTelemetry = (() => {
    try {
      return db ? buildPipelineTimingTelemetrySummary(db, {
        projectPath,
        scopePath,
        focusPath,
        runKind: 'index_project',
        compareDays: 3
      }) : null;
    } catch {
      return null;
    }
  })();
  const behavior = buildBehaviorScore({
    healthScore: databaseHealth?.healthScore,
    issueCount: issueSummary.total,
    structuralGroups: buildStructuralDuplicateGroups(db),
    conceptualGroups: conceptualSummary.actionableGroups,
    pipelineOrphans: pipelineOrphans.orphanCount,
    watcherAlertCount: Array.isArray(watcherAlerts) ? watcherAlerts.length : 0,
    recentWarningCount: notificationCounts.warnings,
    recentErrorCount: notificationCounts.errors,
    phase2PendingFiles: pendingFiles,
    namingDebt: asNumber(folderization?.namingDebt?.renameTargetCount, 0),
    flatFamilies: asNumber(folderization?.familyState?.stateCounts?.flat, 0),
    liveCoverageRatio: asNumber(fileUniverse?.liveCoverageRatio, 0),
    databaseTrustworthy: Boolean(databaseHealth?.healthy),
    clientSyncState: mcpSessionSummary?.clientSyncState || null,
    clientSyncSeverity: mcpSessionSummary?.clientSyncSeverity || null,
    clientSyncReason: mcpSessionSummary?.clientSyncReason || null
  }, {
    progressScore: 0
  }, compilerDriftAssessment, pipelineTimingTelemetry);
  const toolTelemetry = (() => {
    try {
      return db ? buildToolRunTelemetrySummary(db, {
        projectPath,
        scopePath,
        focusPath,
        windowDays: toolRunTelemetryWindowDays
      }) : null;
    } catch {
      return null;
    }
  })();

  const current = {
    projectPath,
    scopePath: normalizeSnapshotPath(scopePath),
    focusPath: normalizeSnapshotPath(focusPath),
    captureSource: captureSource || 'status.runtime',
    capturedAt: new Date().toISOString(),
    analysisGenerationId: analysisGeneration?.generationId || null,
    healthScore: asNumber(databaseHealth?.healthScore, 0),
    healthGrade: databaseHealth?.grade || 'F',
    issueCount: asNumber(issueSummary.total, 0),
    structuralGroups: buildStructuralDuplicateGroups(db),
    conceptualGroups: asNumber(conceptualSummary.actionableGroups, 0),
    conceptualRawGroups: asNumber(conceptualSummary.rawGroups, 0),
    conceptualImplementations: asNumber(conceptualSummary.actionableImplementations, 0),
    pipelineOrphans: asNumber(pipelineOrphans.orphanCount, 0),
    folderizationCandidateCount: asNumber(folderization?.candidateReport?.candidateCount, 0),
    flatFamilies: asNumber(folderization?.familyState?.stateCounts?.flat, 0),
    mixedFamilies: asNumber(folderization?.familyState?.stateCounts?.mixed, 0),
    alreadyFolderizedFamilies: asNumber(folderization?.familyState?.stateCounts?.already_folderized, 0),
    namingFamilies: asNumber(folderization?.naming?.familyCount, 0),
    namingTargets: asNumber(folderization?.naming?.renameTargetCount, 0),
    namingDebt: asNumber(folderization?.namingDebt?.renameTargetCount, 0),
    liveCoverageRatio: asNumber(fileUniverse?.liveCoverageRatio, 0),
    zeroAtomFileCount: asNumber(fileUniverse?.zeroAtomFileCount, 0),
    callLinks: asNumber(graphCoverage.callLinks, 0),
    semanticLinks: asNumber(graphCoverage.semanticLinks, 0),
    activeAtoms: asNumber(databaseHealth?.metrics?.activeAtoms, 0),
    liveRowSync: databaseHealth?.metrics?.liveRowSync || null,
    watcherAlertCount: Array.isArray(watcherAlerts) ? watcherAlerts.length : 0,
    recentWarningCount: notificationCounts.warnings,
    recentErrorCount: notificationCounts.errors,
    phase2PendingFiles: asNumber(pendingFiles, 0),
    mcpSessionSummary: mcpSessionSummary || null,
    databaseTrustworthy: Boolean(databaseHealth?.healthy),
    clientSyncState: mcpSessionSummary?.clientSyncState || null,
    clientSyncSeverity: mcpSessionSummary?.clientSyncSeverity || null,
    clientSyncReason: mcpSessionSummary?.clientSyncReason || null,
    clientSyncRecommendation: mcpSessionSummary?.clientSyncRecommendation || null,
    clientSyncEvidence: mcpSessionSummary?.clientSyncEvidence || null,
    folderizationDecision: folderization?.decision || null,
    driftState: behavior.driftState,
    driftScore: behavior.driftScore,
    stabilityScore: behavior.stabilityScore,
    successScore: behavior.successScore,
    successThreshold: behavior.successThreshold,
    mvpReady: behavior.mvpReady,
    behaviorState: behavior.behaviorState,
    readinessReason: behavior.readinessReason,
    pipelineTimingTelemetry,
    toolTelemetry
  };

  current.summaryText = [
    `health=${current.healthScore}/${current.healthGrade}`,
    `success=${Math.round(current.successScore)}/${current.successThreshold}${current.mvpReady ? ' ready' : ''}`,
    `behavior=${current.behaviorState}`,
    `atoms=${current.activeAtoms}`,
    current.clientSyncState && current.clientSyncState !== 'fresh'
      ? `clientsync=${current.clientSyncState}`
      : null,
    current.pipelineTimingTelemetry?.current?.totalDurationMs
      ? `perf=${current.pipelineTimingTelemetry.performanceState || current.pipelineTimingTelemetry.status || 'unknown'}:${Math.round(current.pipelineTimingTelemetry.current.totalDurationMs)}ms`
      : 'perf=none',
    current.toolTelemetry?.totalRuns > 0
      ? `tools=${current.toolTelemetry.repairedRuns}/${current.toolTelemetry.totalRuns}`
      : 'tools=0',
    `issues=${current.issueCount}`,
    `dups=${current.structuralGroups + current.conceptualGroups}`,
    `folder=${current.alreadyFolderizedFamilies}/${current.flatFamilies + current.mixedFamilies + current.alreadyFolderizedFamilies}`,
    `coverage=${Math.round(current.liveCoverageRatio * 100)}%`
  ].join(' | ');

  return current;
}

function summarizeHistoryRow(row = null) {
  if (!row) {
    return null;
  }

  return {
    capturedAt: row.captured_at || null,
    healthScore: asNumber(row.health_score, 0),
    issueCount: asNumber(row.issue_count, 0),
    structuralGroups: asNumber(row.structural_groups, 0),
    conceptualGroups: asNumber(row.conceptual_groups, 0),
    pipelineOrphans: asNumber(row.pipeline_orphans, 0),
    namingTargets: asNumber(row.naming_targets, 0),
    liveCoverageRatio: asNumber(row.live_coverage_ratio, 0),
    activeAtoms: asNumber(row.active_atoms, 0),
    successScore: asNumber(row.success_score, 0),
    stabilityScore: asNumber(row.stability_score, 0),
    driftScore: asNumber(row.drift_score, 0),
    summaryText: row.summary_text || null
  };
}

function summarizeCurrentSnapshotRow(current = null) {
  if (!current) {
    return null;
  }

  return {
    capturedAt: current.capturedAt || null,
    healthScore: asNumber(current.healthScore, 0),
    issueCount: asNumber(current.issueCount, 0),
    structuralGroups: asNumber(current.structuralGroups, 0),
    conceptualGroups: asNumber(current.conceptualGroups, 0),
    pipelineOrphans: asNumber(current.pipelineOrphans, 0),
    namingTargets: asNumber(current.namingTargets, 0),
    liveCoverageRatio: asNumber(current.liveCoverageRatio, 0),
    activeAtoms: asNumber(current.activeAtoms, 0),
    successScore: asNumber(current.successScore, 0),
    stabilityScore: asNumber(current.stabilityScore, 0),
    driftScore: asNumber(current.driftScore, 0),
    summaryText: current.summaryText || null
  };
}

function loadCompilerMetricsSnapshotHistory(db, options = {}) {
  if (!db?.prepare) {
    return {
      entries: [],
      latest: null,
      previous: null,
      baseline: null
    };
  }

  const {
    projectPath = null,
    snapshotKind = 'status',
    scopePath = null,
    focusPath = null,
    limit = 12,
    compareDays = 3
  } = options;
  const normalizedScope = normalizeSnapshotPath(scopePath);
  const normalizedFocus = normalizeSnapshotPath(focusPath);

  try {
    const rows = db.prepare(`
      SELECT *
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_path, '') = IFNULL(?, '')
        AND IFNULL(focus_path, '') = IFNULL(?, '')
      ORDER BY captured_at DESC
      LIMIT ?
    `).all(projectPath, snapshotKind, normalizedScope, normalizedFocus, limit);

    const baselineCutoff = new Date(Date.now() - (compareDays * 24 * 60 * 60 * 1000)).toISOString();
    const baselineRow = db.prepare(`
      SELECT *
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_path, '') = IFNULL(?, '')
        AND IFNULL(focus_path, '') = IFNULL(?, '')
        AND captured_at <= ?
      ORDER BY captured_at DESC
      LIMIT 1
    `).get(projectPath, snapshotKind, normalizedScope, normalizedFocus, baselineCutoff) || null;

    return {
      entries: rows.map(summarizeHistoryRow),
      latest: summarizeHistoryRow(rows[0] || null),
      previous: summarizeHistoryRow(rows[1] || null),
      baseline: summarizeHistoryRow(baselineRow)
    };
  } catch {
    return {
      entries: [],
      latest: null,
      previous: null,
      baseline: null
    };
  }
}

function buildCompilerMetricsTrend(current = null, history = null, compareDays = 3) {
  const previous = history?.previous || null;
  const baseline = history?.baseline || previous || null;

  if (!current) {
    return {
      status: 'missing',
      daysSincePrevious: 0,
      daysSinceBaseline: 0,
      progressScore: 0,
      velocityPerDay: 0,
      improvingStreak: false,
      behaviorTrend: 0,
      summary: 'No metrics snapshot available.',
      deltaSincePrevious: {},
      deltaSinceBaseline: {}
    };
  }

  const currentCapturedAt = new Date(current.capturedAt || Date.now()).getTime();
  const previousCapturedAt = previous?.capturedAt ? new Date(previous.capturedAt).getTime() : null;
  const baselineCapturedAt = baseline?.capturedAt ? new Date(baseline.capturedAt).getTime() : null;
  const daysSincePrevious = previousCapturedAt ? Math.max(0.01, (currentCapturedAt - previousCapturedAt) / (24 * 60 * 60 * 1000)) : 0;
  const daysSinceBaseline = baselineCapturedAt ? Math.max(0.01, (currentCapturedAt - baselineCapturedAt) / (24 * 60 * 60 * 1000)) : 0;

  const deltaSincePrevious = previous ? {
    healthScore: asNumber(current.healthScore) - asNumber(previous.healthScore),
    issueCount: asNumber(current.issueCount) - asNumber(previous.issueCount),
    structuralGroups: asNumber(current.structuralGroups) - asNumber(previous.structuralGroups),
    conceptualGroups: asNumber(current.conceptualGroups) - asNumber(previous.conceptualGroups),
    conceptualRawGroups: asNumber(current.conceptualRawGroups) - asNumber(previous.conceptualRawGroups),
    pipelineOrphans: asNumber(current.pipelineOrphans) - asNumber(previous.pipelineOrphans),
    folderizationCandidateCount: asNumber(current.folderizationCandidateCount) - asNumber(previous.folderizationCandidateCount),
    flatFamilies: asNumber(current.flatFamilies) - asNumber(previous.flatFamilies),
    mixedFamilies: asNumber(current.mixedFamilies) - asNumber(previous.mixedFamilies),
    alreadyFolderizedFamilies: asNumber(current.alreadyFolderizedFamilies) - asNumber(previous.alreadyFolderizedFamilies),
    namingFamilies: asNumber(current.namingFamilies) - asNumber(previous.namingFamilies),
    namingTargets: asNumber(current.namingTargets) - asNumber(previous.namingTargets),
    namingDebt: asNumber(current.namingDebt) - asNumber(previous.namingDebt),
    liveCoverageRatio: asNumber(current.liveCoverageRatio) - asNumber(previous.liveCoverageRatio),
    activeAtoms: asNumber(current.activeAtoms) - asNumber(previous.activeAtoms),
    zeroAtomFileCount: asNumber(current.zeroAtomFileCount) - asNumber(previous.zeroAtomFileCount),
    callLinks: asNumber(current.callLinks) - asNumber(previous.callLinks),
    semanticLinks: asNumber(current.semanticLinks) - asNumber(previous.semanticLinks),
    watcherAlertCount: asNumber(current.watcherAlertCount) - asNumber(previous.watcherAlertCount),
    recentWarningCount: asNumber(current.recentWarningCount) - asNumber(previous.recentWarningCount),
    recentErrorCount: asNumber(current.recentErrorCount) - asNumber(previous.recentErrorCount),
    phase2PendingFiles: asNumber(current.phase2PendingFiles) - asNumber(previous.phase2PendingFiles)
  } : {};

  const deltaSinceBaseline = baseline ? {
    healthScore: asNumber(current.healthScore) - asNumber(baseline.healthScore),
    issueCount: asNumber(current.issueCount) - asNumber(baseline.issueCount),
    structuralGroups: asNumber(current.structuralGroups) - asNumber(baseline.structuralGroups),
    conceptualGroups: asNumber(current.conceptualGroups) - asNumber(baseline.conceptualGroups),
    conceptualRawGroups: asNumber(current.conceptualRawGroups) - asNumber(baseline.conceptualRawGroups),
    pipelineOrphans: asNumber(current.pipelineOrphans) - asNumber(baseline.pipelineOrphans),
    folderizationCandidateCount: asNumber(current.folderizationCandidateCount) - asNumber(baseline.folderizationCandidateCount),
    flatFamilies: asNumber(current.flatFamilies) - asNumber(baseline.flatFamilies),
    mixedFamilies: asNumber(current.mixedFamilies) - asNumber(baseline.mixedFamilies),
    alreadyFolderizedFamilies: asNumber(current.alreadyFolderizedFamilies) - asNumber(baseline.alreadyFolderizedFamilies),
    namingFamilies: asNumber(current.namingFamilies) - asNumber(baseline.namingFamilies),
    namingTargets: asNumber(current.namingTargets) - asNumber(baseline.namingTargets),
    namingDebt: asNumber(current.namingDebt) - asNumber(baseline.namingDebt),
    liveCoverageRatio: asNumber(current.liveCoverageRatio) - asNumber(baseline.liveCoverageRatio),
    activeAtoms: asNumber(current.activeAtoms) - asNumber(baseline.activeAtoms),
    zeroAtomFileCount: asNumber(current.zeroAtomFileCount) - asNumber(baseline.zeroAtomFileCount),
    callLinks: asNumber(current.callLinks) - asNumber(baseline.callLinks),
    semanticLinks: asNumber(current.semanticLinks) - asNumber(baseline.semanticLinks),
    watcherAlertCount: asNumber(current.watcherAlertCount) - asNumber(baseline.watcherAlertCount),
    recentWarningCount: asNumber(current.recentWarningCount) - asNumber(baseline.recentWarningCount),
    recentErrorCount: asNumber(current.recentErrorCount) - asNumber(baseline.recentErrorCount),
    phase2PendingFiles: asNumber(current.phase2PendingFiles) - asNumber(baseline.phase2PendingFiles)
  } : {};

  const progressScore = calculateProgressScore(deltaSinceBaseline, current, baseline);
  const velocityPerDay = daysSinceBaseline > 0 ? Number((progressScore / daysSinceBaseline).toFixed(2)) : progressScore;
  const recentWindow = Array.isArray(history?.entries) ? history.entries.slice(0, 4) : [];
  const improvingStreak = recentWindow.slice(0, 3).every((entry, index, array) => {
    const next = array[index + 1];
    if (!next) {
      return true;
    }
    return asNumber(entry?.healthScore, 0) >= asNumber(next?.healthScore, 0)
      && asNumber(entry?.issueCount, 0) <= asNumber(next?.issueCount, 0);
  });
  const behaviorTrend = recentWindow.length >= 2
    ? (asNumber(recentWindow[0]?.healthScore, 0) - asNumber(recentWindow[recentWindow.length - 1]?.healthScore, 0))
    : 0;
  const status = !baseline
    ? 'initial'
    : progressScore > 0
      ? 'improving'
      : progressScore < 0
        ? 'regressing'
        : 'stable';

  return {
    status,
    compareDays,
    daysSincePrevious,
    daysSinceBaseline,
    progressScore: Number(progressScore.toFixed(2)),
    velocityPerDay,
    improvingStreak,
    behaviorTrend: Number(behaviorTrend.toFixed(2)),
    summary: !baseline
      ? 'First metrics snapshot captured.'
      : buildTrendSummary(deltaSinceBaseline),
    deltaSincePrevious,
    deltaSinceBaseline,
    baselineCapturedAt: baseline?.capturedAt || null,
    previousCapturedAt: previous?.capturedAt || null
  };
}

function persistCompilerMetricsSnapshot(db, snapshot = null) {
  if (!db?.prepare || !snapshot) {
    return null;
  }

  const current = snapshot.current || {};
  const trend = snapshot.trend || {};
  const stmt = db.prepare(`
    INSERT INTO compiler_metrics_snapshots (
      project_path,
      snapshot_kind,
      scope_path,
      focus_path,
      capture_source,
      analysis_generation_id,
      captured_at,
      health_score,
      health_grade,
      issue_count,
      structural_groups,
      conceptual_groups,
      conceptual_raw_groups,
      pipeline_orphans,
      folderization_candidate_count,
      flat_families,
      mixed_families,
      already_folderized_families,
      naming_families,
      naming_targets,
      naming_debt,
      live_coverage_ratio,
      active_atoms,
      zero_atom_file_count,
      call_links,
      semantic_links,
      watcher_alert_count,
      recent_warning_count,
      recent_error_count,
      phase2_pending_files,
      drift_state,
      drift_score,
      stability_score,
      success_score,
      success_threshold,
      mvp_ready,
      behavior_state,
      readiness_reason,
      snapshot_fingerprint,
      summary_text,
      payload_json,
      trend_json
    ) VALUES (
      @project_path,
      @snapshot_kind,
      @scope_path,
      @focus_path,
      @capture_source,
      @analysis_generation_id,
      @captured_at,
      @health_score,
      @health_grade,
      @issue_count,
      @structural_groups,
      @conceptual_groups,
      @conceptual_raw_groups,
      @pipeline_orphans,
      @folderization_candidate_count,
      @flat_families,
      @mixed_families,
      @already_folderized_families,
      @naming_families,
      @naming_targets,
      @naming_debt,
      @live_coverage_ratio,
      @active_atoms,
      @zero_atom_file_count,
      @call_links,
      @semantic_links,
      @watcher_alert_count,
      @recent_warning_count,
      @recent_error_count,
      @phase2_pending_files,
      @drift_state,
      @drift_score,
      @stability_score,
      @success_score,
      @success_threshold,
      @mvp_ready,
      @behavior_state,
      @readiness_reason,
      @snapshot_fingerprint,
      @summary_text,
      @payload_json,
      @trend_json
    )
  `);

  const payload = {
    current,
    trend,
    summary: snapshot.summary,
    history: {
      entries: snapshot.history?.entries || [],
      previous: snapshot.history?.previous || null,
      baseline: snapshot.history?.baseline || null
    }
  };

  const result = stmt.run({
    project_path: snapshot.projectPath || null,
    snapshot_kind: snapshot.snapshotKind || 'status',
    scope_path: snapshot.scopePath || null,
    focus_path: snapshot.focusPath || null,
    capture_source: snapshot.captureSource || 'status.runtime',
    analysis_generation_id: current.analysisGenerationId || null,
    captured_at: current.capturedAt || new Date().toISOString(),
    health_score: asNumber(current.healthScore, 0),
    health_grade: current.healthGrade || null,
    issue_count: asNumber(current.issueCount, 0),
    structural_groups: asNumber(current.structuralGroups, 0),
    conceptual_groups: asNumber(current.conceptualGroups, 0),
    conceptual_raw_groups: asNumber(current.conceptualRawGroups, 0),
    pipeline_orphans: asNumber(current.pipelineOrphans, 0),
    folderization_candidate_count: asNumber(current.folderizationCandidateCount, 0),
    flat_families: asNumber(current.flatFamilies, 0),
    mixed_families: asNumber(current.mixedFamilies, 0),
    already_folderized_families: asNumber(current.alreadyFolderizedFamilies, 0),
    naming_families: asNumber(current.namingFamilies, 0),
    naming_targets: asNumber(current.namingTargets, 0),
    naming_debt: asNumber(current.namingDebt, 0),
    live_coverage_ratio: asNumber(current.liveCoverageRatio, 0),
    active_atoms: asNumber(current.activeAtoms, 0),
    zero_atom_file_count: asNumber(current.zeroAtomFileCount, 0),
    call_links: asNumber(current.callLinks, 0),
    semantic_links: asNumber(current.semanticLinks, 0),
    watcher_alert_count: asNumber(current.watcherAlertCount, 0),
    recent_warning_count: asNumber(current.recentWarningCount, 0),
    recent_error_count: asNumber(current.recentErrorCount, 0),
    phase2_pending_files: asNumber(current.phase2PendingFiles, 0),
    drift_state: current.driftState || null,
    drift_score: asNumber(current.driftScore, 0),
    stability_score: asNumber(current.stabilityScore, 0),
    success_score: asNumber(current.successScore, 0),
    success_threshold: asNumber(current.successThreshold, 0),
    mvp_ready: current.mvpReady === true ? 1 : 0,
    behavior_state: current.behaviorState || null,
    readiness_reason: current.readinessReason || null,
    snapshot_fingerprint: current.snapshotFingerprint || buildSnapshotFingerprint(snapshot),
    summary_text: snapshot.summary || current.summaryText || null,
    payload_json: JSON.stringify(payload),
    trend_json: JSON.stringify(trend)
  });

  return result;
}

export function buildCompilerMetricsSnapshot(options = {}) {
  const {
    projectPath = null,
    scopePath = null,
    focusPath = null,
    captureSource = 'status.runtime',
    snapshotKind = 'status',
    repo = null,
    compilerExplainability = null,
    watcherAlerts = [],
    recentErrors = null,
    mcpSessionSummary = null,
    phase2PendingFiles = null,
    compareDays = 3,
    toolRunTelemetryWindowDays = 7,
    historyLimit = 12,
    persist = true
  } = options;

  const current = buildCurrentMetrics({
    projectPath,
    scopePath,
    focusPath,
    captureSource,
    snapshotKind,
    compilerExplainability,
    repo,
    watcherAlerts,
    recentErrors,
    driftAssessment: compilerExplainability?.driftAssessment || null,
    toolRunTelemetryWindowDays,
    phase2PendingFiles,
    mcpSessionSummary
  });

  current.snapshotFingerprint = buildSnapshotFingerprint({
    projectPath: current.projectPath,
    snapshotKind,
    scopePath: current.scopePath,
    focusPath: current.focusPath,
    current
  });

  const db = repo?.db || null;
  const history = db
    ? loadCompilerMetricsSnapshotHistory(db, {
        projectPath,
        snapshotKind,
        scopePath,
        focusPath,
        limit: historyLimit,
        compareDays
      })
    : {
        entries: [],
        latest: null,
        previous: null,
        baseline: null
      };

  const trend = buildCompilerMetricsTrend(current, history, compareDays);
  const activeAtomsDrift = buildActiveAtomsDriftAssessment(current, history);
  Object.assign(current, {
    activeAtomsDriftState: activeAtomsDrift.state,
    activeAtomsDriftReason: activeAtomsDrift.reason,
    activeAtomsDriftEvidence: activeAtomsDrift.evidence,
    activeAtomsDelta: activeAtomsDrift.delta,
    activeAtomsDeltaPct: activeAtomsDrift.deltaPct
  });
  const behavior = buildBehaviorScore(current, trend, compilerExplainability?.driftAssessment || null);
  Object.assign(current, behavior);
  const summary = [
    `Health ${current.healthScore}/${current.healthGrade}`,
    trend.summary,
    `progress=${trend.progressScore}`,
    `velocity/day=${trend.velocityPerDay}`,
    `success=${Math.round(current.successScore)}/${current.successThreshold}${current.mvpReady ? ' ready' : ''}`,
    `behavior=${current.behaviorState}`,
    `dbsync=${current.activeAtomsDriftState || 'missing'}`,
    current.clientSyncState && current.clientSyncState !== 'fresh'
      ? `clientsync=${current.clientSyncState}`
      : null,
    `dups=${current.structuralGroups + current.conceptualGroups}`,
    `folder=${current.alreadyFolderizedFamilies}/${current.flatFamilies + current.mixedFamilies + current.alreadyFolderizedFamilies}`,
    `coverage=${Math.round(current.liveCoverageRatio * 100)}%`
  ].join(' | ');
  current.summaryText = summary;

  const currentHistoryEntry = summarizeCurrentSnapshotRow(current);
  const returnedHistory = {
    entries: currentHistoryEntry ? [currentHistoryEntry, ...history.entries] : history.entries,
    latest: currentHistoryEntry || history.latest,
    previous: history.latest,
    baseline: history.baseline
  };

  const snapshot = {
    projectPath,
    scopePath: normalizeSnapshotPath(scopePath),
    focusPath: normalizeSnapshotPath(focusPath),
    snapshotKind,
    captureSource,
    current,
    trend,
    history: returnedHistory,
    summary
  };

  if (persist && db) {
    try {
      persistCompilerMetricsSnapshot(db, snapshot);
    } catch {
      // Persistence is advisory. The snapshot still returns even if SQLite is transiently busy.
    }
  }

  return snapshot;
}

export function summarizeCompilerMetricsSnapshot(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  const current = snapshot.current || {};
  const trend = snapshot.trend || {};

  return {
    projectPath: snapshot.projectPath || null,
    scopePath: snapshot.scopePath || null,
    focusPath: snapshot.focusPath || null,
    snapshotKind: snapshot.snapshotKind || 'status',
    captureSource: snapshot.captureSource || null,
    capturedAt: current.capturedAt || null,
    current: {
      healthScore: current.healthScore || 0,
      healthGrade: current.healthGrade || 'F',
      issueCount: current.issueCount || 0,
      structuralGroups: current.structuralGroups || 0,
      conceptualGroups: current.conceptualGroups || 0,
      conceptualRawGroups: current.conceptualRawGroups || 0,
      pipelineOrphans: current.pipelineOrphans || 0,
      folderizationCandidateCount: current.folderizationCandidateCount || 0,
      flatFamilies: current.flatFamilies || 0,
      mixedFamilies: current.mixedFamilies || 0,
      alreadyFolderizedFamilies: current.alreadyFolderizedFamilies || 0,
      namingFamilies: current.namingFamilies || 0,
      namingTargets: current.namingTargets || 0,
      namingDebt: current.namingDebt || 0,
      liveCoverageRatio: current.liveCoverageRatio || 0,
      activeAtoms: current.activeAtoms || 0,
      zeroAtomFileCount: current.zeroAtomFileCount || 0,
      callLinks: current.callLinks || 0,
      semanticLinks: current.semanticLinks || 0,
      watcherAlertCount: current.watcherAlertCount || 0,
      recentWarningCount: current.recentWarningCount || 0,
      recentErrorCount: current.recentErrorCount || 0,
      phase2PendingFiles: current.phase2PendingFiles || 0,
      mcpSessionSummary: current.mcpSessionSummary || null,
      databaseTrustworthy: current.databaseTrustworthy || false,
      clientSyncState: current.clientSyncState || null,
      clientSyncSeverity: current.clientSyncSeverity || null,
      clientSyncReason: current.clientSyncReason || null,
      clientSyncRecommendation: current.clientSyncRecommendation || null,
      folderizationDecision: current.folderizationDecision || null,
      driftState: current.driftState || null,
      driftScore: current.driftScore || 0,
      stabilityScore: current.stabilityScore || 0,
      successScore: current.successScore || 0,
      successThreshold: current.successThreshold || 0,
      mvpReady: current.mvpReady || false,
      behaviorState: current.behaviorState || null,
      readinessReason: current.readinessReason || null,
      activeAtomsDriftState: current.activeAtomsDriftState || null,
      activeAtomsDriftReason: current.activeAtomsDriftReason || null,
      activeAtomsDelta: current.activeAtomsDelta || 0,
      activeAtomsDeltaPct: current.activeAtomsDeltaPct || 0,
      pipelineTimingTelemetry: current.pipelineTimingTelemetry ? {
        projectPath: current.pipelineTimingTelemetry.projectPath || null,
        runKind: current.pipelineTimingTelemetry.runKind || 'pipeline',
        status: current.pipelineTimingTelemetry.status || null,
        performanceState: current.pipelineTimingTelemetry.performanceState || null,
        performanceScore: current.pipelineTimingTelemetry.performanceScore || 0,
        capturedAt: current.pipelineTimingTelemetry.capturedAt || null,
        current: current.pipelineTimingTelemetry.current || null,
        trend: current.pipelineTimingTelemetry.trend || null,
        history: current.pipelineTimingTelemetry.history || null,
        summary: current.pipelineTimingTelemetry.summary || null,
        oneLine: current.pipelineTimingTelemetry.oneLine || null
      } : null,
      toolTelemetry: current.toolTelemetry ? {
        totalRuns: current.toolTelemetry.totalRuns || 0,
        successfulRuns: current.toolTelemetry.successfulRuns || 0,
        repairedRuns: current.toolTelemetry.repairedRuns || 0,
        thrashingRuns: current.toolTelemetry.thrashingRuns || 0,
        repairYield: current.toolTelemetry.repairYield || 0,
        toolSuccessRate: current.toolTelemetry.toolSuccessRate || 0,
        alertClearanceRate: current.toolTelemetry.alertClearanceRate || 0,
        errorClearanceRate: current.toolTelemetry.errorClearanceRate || 0,
        averageDurationMs: current.toolTelemetry.averageDurationMs || 0,
        averageRepairScore: current.toolTelemetry.averageRepairScore || 0,
        lastRunAt: current.toolTelemetry.lastRunAt || null,
        lastSuccessfulRunAt: current.toolTelemetry.lastSuccessfulRunAt || null,
        topTools: Array.isArray(current.toolTelemetry.topTools) ? current.toolTelemetry.topTools.slice(0, 5) : []
      } : null
    },
    trend: {
      status: trend.status || 'missing',
      summary: trend.summary || null,
      progressScore: trend.progressScore || 0,
      velocityPerDay: trend.velocityPerDay || 0,
      improvingStreak: trend.improvingStreak || false,
      behaviorTrend: trend.behaviorTrend || 0,
      daysSincePrevious: trend.daysSincePrevious || 0,
      daysSinceBaseline: trend.daysSinceBaseline || 0,
      baselineCapturedAt: trend.baselineCapturedAt || null,
      previousCapturedAt: trend.previousCapturedAt || null,
      deltaSincePrevious: trend.deltaSincePrevious || {},
      deltaSinceBaseline: trend.deltaSinceBaseline || {}
    },
    history: {
      total: Array.isArray(snapshot.history?.entries) ? snapshot.history.entries.length : 0,
      latestCapturedAt: snapshot.history?.latest?.capturedAt || null,
      previousCapturedAt: snapshot.history?.previous?.capturedAt || null,
      baselineCapturedAt: snapshot.history?.baseline?.capturedAt || null,
      latest: snapshot.history?.latest || null,
      previous: snapshot.history?.previous || null,
      baseline: snapshot.history?.baseline || null
    },
    summary: snapshot.summary || null
  };
}

export default {
  buildCompilerMetricsSnapshot,
  summarizeCompilerMetricsSnapshot
};
