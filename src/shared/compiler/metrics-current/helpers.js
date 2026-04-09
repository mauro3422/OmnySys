/**
 * @fileoverview Internal helpers for compiler metrics current-snapshot assembly.
 */

import { summarizeCompilerDriftAssessment } from './compiler-drift-assessment.js';
import { getValidDnaPredicate, getDuplicateEligiblePredicate } from '#layer-c/storage/repository/utils/duplicate-dna.js';
import { asNumber } from './core-utils.js';
import { clampScore } from '#shared/utils/normalize-helpers.js';

function buildBehaviorGateSummary(current = {}, driftSummary = null) {
  const blockedBy = [];
  const watchSignals = [];

  const addBlockedBy = (gate, reason, recommendation, evidence = null) => {
    blockedBy.push({ gate, state: 'blocked', reason, recommendation, evidence });
  };
  const addWatchSignal = (gate, state, reason, recommendation, evidence = null) => {
    watchSignals.push({ gate, state, reason, recommendation, evidence });
  };

  if (!current.databaseTrustworthy) {
    addBlockedBy(
      'database_health',
      'Database trust is still insufficient for MVP readiness.',
      'Reconcile the canonical database projections before trusting runtime health metrics.',
      { databaseTrustworthy: false }
    );
  }

  if (asNumber(current.recentErrorCount, 0) > 0) {
    addBlockedBy(
      'recent_errors',
      `${asNumber(current.recentErrorCount, 0)} recent error(s) are still active.`,
      'Resolve the active error stream before trusting readiness.',
      { recentErrorCount: asNumber(current.recentErrorCount, 0) }
    );
  } else if (asNumber(current.recentWarningCount, 0) > 0) {
    addWatchSignal(
      'recent_warnings',
      'watchful',
      `${asNumber(current.recentWarningCount, 0)} warning(s) are still active.`,
      'Keep watching warning volume to avoid a regression into blocked mode.',
      { recentWarningCount: asNumber(current.recentWarningCount, 0) }
    );
  }

  if (current.activeAtomsDriftState === 'blocked') {
    addBlockedBy(
      'active_atoms_drift',
      current.activeAtomsDriftReason || 'Active atom counts are out of sync with the live database surfaces.',
      'Reconcile the database surfaces before trusting active atom counts.',
      { activeAtomsDriftState: current.activeAtomsDriftState, activeAtomsDelta: current.activeAtomsDelta, activeAtomsDeltaPct: current.activeAtomsDeltaPct }
    );
  } else if (current.activeAtomsDriftState === 'stale') {
    addWatchSignal(
      'active_atoms_drift',
      'watchful',
      current.activeAtomsDriftReason || 'Active atom counts are drifting.',
      'Watch the active atom count for desynchronization before trusting downstream metrics.',
      { activeAtomsDriftState: current.activeAtomsDriftState, activeAtomsDelta: current.activeAtomsDelta, activeAtomsDeltaPct: current.activeAtomsDeltaPct }
    );
  }

  if (current.clientSyncState === 'blocked') {
    addBlockedBy(
      'client_sync',
      current.clientSyncReason || 'MCP client session sync is blocked.',
      current.clientSyncRecommendation || 'Repair client session sync before trusting runtime health metrics.',
      { clientSyncState: current.clientSyncState, clientSyncSeverity: current.clientSyncSeverity }
    );
  } else if (current.clientSyncState === 'stale' || current.clientSyncState === 'reconciling') {
    addWatchSignal(
      'client_sync',
      current.clientSyncState,
      current.clientSyncReason || 'MCP client session sync is still reconciling.',
      current.clientSyncRecommendation || 'Keep an eye on client session churn and refresh the UI if tools disappear again.',
      { clientSyncState: current.clientSyncState, clientSyncSeverity: current.clientSyncSeverity }
    );
  }

  if (driftSummary?.status === 'blocked') {
    addBlockedBy(
      'drift_assessment',
      driftSummary.primaryIssue?.reason || driftSummary.nextAction || 'Drift surfaces are blocked.',
      driftSummary.primaryIssue?.recommendation || driftSummary.nextAction || 'Resolve the active drift findings before trusting downstream reads.',
      { status: driftSummary.status, primaryIssue: driftSummary.primaryIssue || null, recommendations: driftSummary.recommendations || [] }
    );
  } else if (driftSummary?.status === 'drifting' || driftSummary?.status === 'updated') {
    addWatchSignal(
      'drift_assessment',
      driftSummary.status,
      driftSummary.primaryIssue?.reason || driftSummary.nextAction || 'Drift surfaces still need attention.',
      driftSummary.primaryIssue?.recommendation || driftSummary.nextAction || 'Reduce policy drift in existing canonical families before adding more heuristics.',
      { status: driftSummary.status, primaryIssue: driftSummary.primaryIssue || null, recommendations: driftSummary.recommendations || [] }
    );
  }

  if (asNumber(current.phase2PendingFiles, 0) > 0) {
    addWatchSignal(
      'phase2_pending_files',
      'settling',
      `${asNumber(current.phase2PendingFiles, 0)} file(s) still pending Phase 2.`,
      'Wait for Phase 2 to settle before forcing live-row cleanup.',
      { phase2PendingFiles: asNumber(current.phase2PendingFiles, 0) }
    );
  }

  if (asNumber(current.watcherAlertCount, 0) > 0) {
    addWatchSignal(
      'watcher_alerts',
      'watchful',
      `${asNumber(current.watcherAlertCount, 0)} watcher alert(s) remain active.`,
      'Review the watcher alerts before treating the status panel as fully quiet.',
      { watcherAlertCount: asNumber(current.watcherAlertCount, 0) }
    );
  }

  return {
    blockedBy,
    watchSignals,
    blockerCount: blockedBy.length,
    watchCount: watchSignals.length,
    primaryBlocker: blockedBy[0] || null,
    primaryWatchSignal: watchSignals[0] || null
  };
}

export function buildStructuralDuplicateGroups(db) {
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
      : current.clientSyncState === 'reconciling'
        ? 1
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
  const gateSummary = buildBehaviorGateSummary(current, driftSummary);

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

  const behaviorState = gateSummary.blockerCount > 0
    ? 'blocked'
    : successScore >= successThreshold
      ? 'ready'
      : successScore >= 70
        ? 'watchful'
        : 'noisy';

  const readinessReason = mvpReady
    ? 'System satisfies the current MVP success threshold.'
    : gateSummary.primaryBlocker
      ? gateSummary.primaryBlocker.reason
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
    readinessReason,
    behaviorGateSummary: gateSummary,
    blockedBy: gateSummary.blockedBy,
    watchSignals: gateSummary.watchSignals,
    primaryBlocker: gateSummary.primaryBlocker,
    primaryWatchSignal: gateSummary.primaryWatchSignal,
    driftSummary
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
    summaryText: row.summary_text || null,
    behaviorState: row.behavior_state || null,
    readinessReason: row.readiness_reason || null
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
    summaryText: current.summaryText || null,
    behaviorState: current.behaviorState || null,
    readinessReason: current.readinessReason || null,
    behaviorGateSummary: current.behaviorGateSummary || null,
    behaviorBlockers: Array.isArray(current.behaviorBlockers) ? current.behaviorBlockers : [],
    behaviorWatchSignals: Array.isArray(current.behaviorWatchSignals) ? current.behaviorWatchSignals : [],
    primaryBehaviorBlocker: current.primaryBehaviorBlocker || null
  };
}
