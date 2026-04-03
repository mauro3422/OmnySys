/**
 * @fileoverview Canonical compiler metrics snapshot entrypoint.
 *
 * This module stays intentionally thin. The heavy lifting lives in
 * compiler-metrics-current.js and compiler-metrics-snapshot-helpers.js.
 */

import {
  buildActiveAtomsDriftAssessment,
  buildBehaviorScore,
  buildCompilerLayerReliability,
  buildCompilerMetricDictionary,
  buildCompilerMetricsTrend,
  buildCurrentMetrics,
  buildSnapshotFingerprint,
  clampScore,
  gradeFromScore,
  loadCompilerMetricsSnapshotHistory,
  muteBootstrapTrend,
  normalizeSnapshotPath,
  persistCompilerMetricsSnapshot,
  shouldMuteBootstrapTrend,
  summarizeCompilerMetricDictionary,
  summarizeCurrentSnapshotRow
} from './compiler-metrics-snapshot-helpers.js';
import {
  loadCompilerHealthArchiveSummary,
  persistCompilerHealthArchiveSnapshot
} from './compiler-health-archive.js';
import { summarizeCompilerMetricsSnapshot } from './compiler-metrics-snapshot-summary.js';

export { summarizeCompilerMetricsSnapshot };

export function buildCompilerMetricsSnapshot(options = {}) {
  const {
    projectPath = null,
    scopePath = null,
    focusPath = null,
    captureSource = 'status.runtime',
    snapshotKind = 'status',
    repo = null,
    compilerExplainability = null,
    systemInventory = null,
    canonicalPromotion = null,
    startupTelemetry = null,
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
    systemInventory,
    canonicalPromotion,
    startupTelemetry,
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
    : { entries: [], latest: null, previous: null, baseline: null };

  const trend = buildCompilerMetricsTrend(current, history, compareDays);
  const normalizedTrend = shouldMuteBootstrapTrend(trend) ? muteBootstrapTrend(trend) : trend;

  const activeAtomsDrift = buildActiveAtomsDriftAssessment(current, history);
  Object.assign(current, {
    activeAtomsDriftState: activeAtomsDrift.state,
    activeAtomsDriftReason: activeAtomsDrift.reason,
    activeAtomsDriftEvidence: activeAtomsDrift.evidence,
    activeAtomsDelta: activeAtomsDrift.delta,
    activeAtomsDeltaPct: activeAtomsDrift.deltaPct
  });

  const behavior = buildBehaviorScore(current, normalizedTrend, compilerExplainability?.driftAssessment || null);
  Object.assign(current, behavior);

  const layerReliability = buildCompilerLayerReliability({ current, compilerExplainability });
  const globalHealthScore = clampScore(
    (Number(current.healthScore || 0) * 0.55) + (Number(layerReliability.global?.score || 0) * 0.45)
  );

  Object.assign(current, {
    reliabilityScore: Number(layerReliability.global?.score || 0),
    reliabilityGrade: layerReliability.global?.grade || gradeFromScore(layerReliability.global?.score),
    reliabilityState: layerReliability.global?.state || null,
    globalHealthScore: Number(globalHealthScore.toFixed(2)),
    globalHealthGrade: gradeFromScore(globalHealthScore),
    layerReliability
  });

  const summary = [
    `Health ${Math.round(current.globalHealthScore)}/${current.globalHealthGrade}`,
    `db=${current.healthScore}/${current.healthGrade}`,
    `trust=${Math.round(current.reliabilityScore)}/${current.reliabilityGrade}`,
    normalizedTrend.summary,
    `progress=${normalizedTrend.progressScore}`,
    `velocity/day=${normalizedTrend.velocityPerDay}`,
    `success=${Math.round(current.successScore)}/${current.successThreshold}${current.mvpReady ? ' ready' : ''}`,
    `behavior=${current.behaviorState}`,
    `dbsync=${current.activeAtomsDriftState || 'missing'}`,
    current.clientSyncState && current.clientSyncState !== 'fresh' ? `clientsync=${current.clientSyncState}` : null,
    current.toolTelemetry?.totalRuns > 0 ? `tools=${current.toolTelemetry.successfulRuns}/${current.toolTelemetry.totalRuns} ok` : 'tools=0',
    current.toolTelemetry?.pressureRuns > 0 ? `repair=${current.toolTelemetry.repairedRuns}/${current.toolTelemetry.pressureRuns}` : null,
    `dups=${current.structuralGroups + current.conceptualGroups}`,
    `folder=${current.alreadyFolderizedFamilies}/${current.flatFamilies + current.mixedFamilies + current.alreadyFolderizedFamilies}`,
    `coverage=${Math.round(current.liveCoverageRatio * 100)}%`
  ].filter(Boolean).join(' | ');
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
    trend: normalizedTrend,
    history: returnedHistory,
    metricDictionary: summarizeCompilerMetricDictionary(
      buildCompilerMetricDictionary({
        current,
        compilerExplainability,
        reliability: layerReliability
      })
    ),
    summary
  };

  if (persist && db) {
    try {
      persistCompilerMetricsSnapshot(db, snapshot);
    } catch {
      // Persistence is advisory. The snapshot still returns even if SQLite is transiently busy.
    }
  }

  if (persist && projectPath) {
    try {
      persistCompilerHealthArchiveSnapshot(projectPath, snapshot);
    } catch {
      // The archive is advisory too. Reindex/reanalyze must never depend on it.
    }
  }

  const healthArchive = projectPath
    ? loadCompilerHealthArchiveSummary(projectPath, {
        snapshotKind,
        scopePath: snapshot.scopePath,
        focusPath: snapshot.focusPath
      })
    : null;

  if (healthArchive) {
    snapshot.healthArchive = healthArchive;
    snapshot.current.healthArchive = healthArchive;
  }

  return snapshot;
}

export default {
  buildCompilerMetricsSnapshot,
  summarizeCompilerMetricsSnapshot
};
