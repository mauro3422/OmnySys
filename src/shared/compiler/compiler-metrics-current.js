/**
 * @fileoverview Current compiler metrics construction helpers.
 *
 * This module isolates the heavy current-snapshot assembly and behavior
 * scoring logic from the canonical snapshot orchestrator.
 *
 * @module shared/compiler/compiler-metrics-current
 */

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
        WHERE (${validDna})
          AND (${eligible})
        GROUP BY dna_json
        HAVING COUNT(*) > 1
      )
    `).get();
    return asNumber(row?.n, 0);
  } catch {
    return 0;
  }
}

function buildCurrentSummaries({
  db,
  repo,
  compilerExplainability,
  driftAssessment,
  projectPath,
  scopePath,
  focusPath,
  watcherAlerts,
  recentErrors,
  phase2PendingFiles,
  toolRunTelemetryWindowDays,
  mcpSessionSummary
}) {
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
  const notificationCounts = {
    total: asNumber(recentErrors?.summary?.total, 0),
    warnings: asNumber(recentErrors?.summary?.warnings, 0),
    errors: asNumber(recentErrors?.summary?.errors, 0)
  };
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

  return {
    graphCoverage,
    issueSummary,
    conceptualSummary,
    pipelineOrphans,
    folderization,
    databaseHealth,
    fileUniverse,
    analysisGeneration,
    compilerDriftAssessment,
    notificationCounts,
    pendingFiles,
    pipelineTimingTelemetry,
    toolTelemetry,
    behavior
  };
}

export function buildBehaviorScore(current = {}, trend = {}, driftAssessment = null, pipelineTimingTelemetry = null) {
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

export function summarizeHistoryRow(row = null) {
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

export function summarizeCurrentSnapshotRow(current = null) {
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

export function buildCurrentMetrics({
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
  const summaries = buildCurrentSummaries({
    db,
    repo,
    compilerExplainability,
    driftAssessment,
    projectPath,
    scopePath,
    focusPath,
    watcherAlerts,
    recentErrors,
    phase2PendingFiles,
    toolRunTelemetryWindowDays,
    mcpSessionSummary
  });
  const {
    graphCoverage,
    issueSummary,
    conceptualSummary,
    pipelineOrphans,
    folderization,
    databaseHealth,
    fileUniverse,
    analysisGeneration,
    compilerDriftAssessment,
    notificationCounts,
    pendingFiles,
    pipelineTimingTelemetry,
    toolTelemetry,
    behavior
  } = summaries;

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
    metadataCoveragePct: asNumber(compilerExplainability?.metadataExtractionCoverage?.summary?.coveragePct, 0),
    metadataFieldCoveragePct: asNumber(compilerExplainability?.metadataExtractionCoverage?.summary?.fieldCoveragePct, 0),
    dataGatewayTrustworthy: compilerExplainability?.dataGatewayContract?.summary?.trustworthy === true,
    dataGatewayState: compilerExplainability?.dataGatewayContract?.summary?.primaryIssue?.state
      || (compilerExplainability?.dataGatewayContract?.summary?.trustworthy === true ? 'trustworthy' : 'needs_attention'),
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
      ? `tools=${current.toolTelemetry.successfulRuns}/${current.toolTelemetry.totalRuns} ok`
      : 'tools=0',
    current.toolTelemetry?.pressureRuns > 0
      ? `repair=${current.toolTelemetry.repairedRuns}/${current.toolTelemetry.pressureRuns}`
      : null,
    `issues=${current.issueCount}`,
    `dups=${current.structuralGroups + current.conceptualGroups}`,
    `folder=${current.alreadyFolderizedFamilies}/${current.flatFamilies + current.mixedFamilies + current.alreadyFolderizedFamilies}`,
    `coverage=${Math.round(current.liveCoverageRatio * 100)}%`
  ].join(' | ');

  return current;
}
