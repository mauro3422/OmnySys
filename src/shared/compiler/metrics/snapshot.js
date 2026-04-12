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
} from './index.js';
import { buildCompilerMetricsSnapshotSummary } from './snapshot-summary-text.js';
import {
  loadCompilerHealthArchiveSummary,
  persistCompilerHealthArchiveSnapshot,
  persistCompilerMetricsArchiveSnapshot
} from '../compiler-health-archive.js';
import { validateSnapshotSummaryCoherence } from '../metric-coherence-validator.js';
import { summarizeCompilerMetricsSnapshot } from './snapshot-summary/index.js';

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
    proxyRuntimeTelemetry = null,
    bridgeRuntimeTelemetry = null,
    watcherAlerts = [],
    recentErrors = null,
    mcpSessionSummary = null,
    mcpRequestDeliverySummary = null,
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
    proxyRuntimeTelemetry,
    bridgeRuntimeTelemetry,
    repo,
    watcherAlerts,
    recentErrors,
    driftAssessment: compilerExplainability?.driftAssessment || null,
    toolRunTelemetryWindowDays,
    phase2PendingFiles,
    mcpSessionSummary,
    mcpRequestDeliverySummary
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

  const summary = buildCompilerMetricsSnapshotSummary(current, normalizedTrend);
  current.summaryText = summary;

  const currentHistoryEntry = summarizeCurrentSnapshotRow(current);
  const safeHistoryEntries = Array.isArray(history?.entries) ? history.entries : [];
  const returnedHistory = {
    entries: currentHistoryEntry ? [currentHistoryEntry, ...safeHistoryEntries] : safeHistoryEntries,
    latest: currentHistoryEntry || history?.latest || null,
    previous: history?.latest || null,
    baseline: history?.baseline || null
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

  const summaryCoherence = validateSnapshotSummaryCoherence(snapshot);
  snapshot.summaryCoherence = summaryCoherence;
  snapshot.current.summaryCoherence = summaryCoherence;

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
      persistCompilerMetricsArchiveSnapshot(projectPath, snapshot);
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
