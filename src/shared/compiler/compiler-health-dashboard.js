/**
 * Compiler health dashboard helpers.
 *
 * Builds a compact operational view on top of compiler metrics snapshots so
 * status and tools can expose health, readiness, velocity, regressions and
 * repair guidance from the same source of truth.
 */

import {
  asNumber,
  buildRecommendations,
  buildSignalRows,
  buildCompilerHealthPanel as buildCompilerHealthPanelDetails,
  mapPipelineTimingTelemetry,
  mapToolTelemetry,
  normalizeSnapshot,
  summarizeCompilerHealthDashboard as summarizeCompilerHealthDashboardDetails,
  summarizeCompilerHealthPanel as summarizeCompilerHealthPanelDetails,
  takeSample
} from './compiler-health-dashboard-helpers.js';

export function buildCompilerHealthDashboard(snapshot = null, compilerExplainability = null, options = {}) {
  const normalized = normalizeSnapshot(snapshot);
  const current = normalized.current || {};
  const trend = normalized.trend || {};
  const history = normalized.history || {};
  const watcherAlerts = Array.isArray(options.watcherAlerts) ? options.watcherAlerts : [];
  const recentErrors = options.recentErrors || null;
  const signalRows = buildSignalRows(trend.deltaSinceBaseline || {});
  const toolTelemetry = mapToolTelemetry(current.toolTelemetry);
  const pipelineTimingTelemetry = mapPipelineTimingTelemetry(current.pipelineTimingTelemetry);

  const regressors = signalRows.filter((row) => row.impact < 0).slice(0, 5);
  const improvements = signalRows.filter((row) => row.impact > 0).slice(0, 5);

  return {
    projectPath: normalized.projectPath || null,
    scopePath: normalized.scopePath || null,
    focusPath: normalized.focusPath || null,
    snapshotKind: normalized.snapshotKind || 'status',
    captureSource: normalized.captureSource || null,
    capturedAt: normalized.capturedAt || current.capturedAt || null,
    status: current.mvpReady ? 'ready' : current.behaviorState || trend.status || 'unknown',
    health: {
      globalHealthScore: asNumber(current.globalHealthScore, asNumber(current.healthScore, 0)),
      globalHealthGrade: current.globalHealthGrade || current.healthGrade || 'F',
      healthScore: asNumber(current.healthScore, 0),
      healthGrade: current.healthGrade || 'F',
      reliabilityScore: asNumber(current.reliabilityScore, 0),
      reliabilityGrade: current.reliabilityGrade || 'F',
      reliabilityState: current.reliabilityState || null,
      successScore: asNumber(current.successScore, 0),
      successThreshold: asNumber(current.successThreshold, 0),
      mvpReady: current.mvpReady === true,
      behaviorState: current.behaviorState || null,
      readinessReason: current.readinessReason || null,
      driftState: current.driftState || null,
      driftScore: asNumber(current.driftScore, 0),
      stabilityScore: asNumber(current.stabilityScore, 0),
      activeAtomsDriftState: current.activeAtomsDriftState || null,
      activeAtomsDriftReason: current.activeAtomsDriftReason || null,
      clientSyncState: current.clientSyncState || null,
      clientSyncSeverity: current.clientSyncSeverity || null,
      clientSyncReason: current.clientSyncReason || null,
      clientSyncRecommendation: current.clientSyncRecommendation || null,
      activeAtomsDelta: asNumber(current.activeAtomsDelta, 0),
      activeAtomsDeltaPct: asNumber(current.activeAtomsDeltaPct, 0)
    },
    trend: {
      status: trend.status || 'missing',
      summary: trend.summary || null,
      progressScore: asNumber(trend.progressScore, 0),
      velocityPerDay: asNumber(trend.velocityPerDay, 0),
      improvingStreak: trend.improvingStreak === true,
      behaviorTrend: asNumber(trend.behaviorTrend, 0),
      daysSincePrevious: asNumber(trend.daysSincePrevious, 0),
      daysSinceBaseline: asNumber(trend.daysSinceBaseline, 0)
    },
    metrics: {
      issueCount: asNumber(current.issueCount, 0),
      structuralGroups: asNumber(current.structuralGroups, 0),
      conceptualGroups: asNumber(current.conceptualGroups, 0),
      pipelineOrphans: asNumber(current.pipelineOrphans, 0),
      folderizationCandidateCount: asNumber(current.folderizationCandidateCount, 0),
      flatFamilies: asNumber(current.flatFamilies, 0),
      mixedFamilies: asNumber(current.mixedFamilies, 0),
      alreadyFolderizedFamilies: asNumber(current.alreadyFolderizedFamilies, 0),
      namingFamilies: asNumber(current.namingFamilies, 0),
      namingTargets: asNumber(current.namingTargets, 0),
      namingDebt: asNumber(current.namingDebt, 0),
      liveCoverageRatio: asNumber(current.liveCoverageRatio, 0),
      activeAtoms: asNumber(current.activeAtoms, 0),
      zeroAtomFileCount: asNumber(current.zeroAtomFileCount, 0),
      callLinks: asNumber(current.callLinks, 0),
      semanticLinks: asNumber(current.semanticLinks, 0),
      watcherAlertCount: asNumber(current.watcherAlertCount, 0),
      recentWarningCount: asNumber(current.recentWarningCount, 0),
      recentErrorCount: asNumber(current.recentErrorCount, 0),
      phase2PendingFiles: asNumber(current.phase2PendingFiles, 0),
      metadataCoveragePct: asNumber(current.metadataCoveragePct, 0),
      metadataFieldCoveragePct: asNumber(current.metadataFieldCoveragePct, 0),
      dataGatewayTrustworthy: current.dataGatewayTrustworthy === true,
      pipelineTimingTelemetry
    },
    sessions: current.mcpSessionSummary ? {
      summary: current.mcpSessionSummary.summary || null,
      clientSyncState: current.mcpSessionSummary.clientSyncState || null,
      clientSyncReason: current.mcpSessionSummary.clientSyncReason || null,
      clientSyncRecommendation: current.mcpSessionSummary.clientSyncRecommendation || null,
      clientSyncSummary: current.mcpSessionSummary.clientSyncSummary || null
    } : null,
    toolTelemetry,
    metricDictionary: normalized.metricDictionary || null,
    regressors,
    improvements,
    recommendations: buildRecommendations(normalized, compilerExplainability),
    watcherAlerts: takeSample(watcherAlerts, 5),
    recentErrors: recentErrors ? {
      total: asNumber(recentErrors?.summary?.total, 0),
      warnings: asNumber(recentErrors?.summary?.warnings, 0),
      errors: asNumber(recentErrors?.summary?.errors, 0),
      logs: takeSample(recentErrors?.logs || [], 3)
    } : null,
    history: {
      total: Array.isArray(history?.entries) ? history.entries.length : 0,
      latestCapturedAt: history?.latest?.capturedAt || null,
      previousCapturedAt: history?.previous?.capturedAt || null,
      baselineCapturedAt: history?.baseline?.capturedAt || null
    },
    summary: current.summaryText || trend.summary || null
  };
}

export function summarizeCompilerHealthDashboard(dashboard = null) {
  return summarizeCompilerHealthDashboardDetails(dashboard);
}

export function buildCompilerHealthPanel(dashboard = null) {
  return buildCompilerHealthPanelDetails(dashboard);
}

export function summarizeCompilerHealthPanel(panel = null) {
  return summarizeCompilerHealthPanelDetails(panel);
}

export default {
  buildCompilerHealthDashboard,
  summarizeCompilerHealthDashboard,
  buildCompilerHealthPanel,
  summarizeCompilerHealthPanel
};
