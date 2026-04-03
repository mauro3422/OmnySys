/**
 * Summary and panel helpers for compiler health dashboards.
 */

import { asNumber } from './core-utils.js';
import { mapArchiveSummary } from './compiler-health-dashboard-archive.js';
import { buildPanelHighlights, buildPanelIdentity, buildPanelSections } from './compiler-health-dashboard-panel-helpers.js';
import { takeSample } from './sample-helpers.js';

function mapHealthSummaryCore(current = {}) {
  return {
    globalHealthScore: asNumber(current.globalHealthScore, asNumber(current.healthScore, 0)),
    globalHealthGrade: current.globalHealthGrade || current.healthGrade || 'F',
    healthScore: asNumber(current.healthScore, 0),
    healthGrade: current.healthGrade || 'F',
    reliabilityScore: asNumber(current.reliabilityScore, 0),
    reliabilityGrade: current.reliabilityGrade || 'F',
    successScore: asNumber(current.successScore, 0),
    successThreshold: asNumber(current.successThreshold, 0),
    mvpReady: current.mvpReady === true,
    activeAtomsDelta: asNumber(current.activeAtomsDelta, 0),
    activeAtomsDeltaPct: asNumber(current.activeAtomsDeltaPct, 0)
  };
}

function mapHealthSummaryConnectionSignals(current = {}) {
  return {
    clientSyncState: current.clientSyncState || null,
    clientSyncSeverity: current.clientSyncSeverity || null,
    clientSyncReason: current.clientSyncReason || null,
    clientSyncRecommendation: current.clientSyncRecommendation || null
  };
}

function mapHealthSummaryPropagationSignals(current = {}) {
  return {
    propagationExpansionState: current.propagationExpansionState || null,
    propagationExpansionReason: current.propagationExpansionReason || null,
    propagationExpansionRecommendation: current.propagationExpansionRecommendation || null
  };
}

function mapHealthSummarySignals(current = {}) {
  return {
    reliabilityState: current.reliabilityState || null,
    behaviorState: current.behaviorState || null,
    readinessReason: current.readinessReason || null,
    driftState: current.driftState || null,
    driftScore: asNumber(current.driftScore, 0),
    stabilityScore: asNumber(current.stabilityScore, 0),
    activeAtomsDriftState: current.activeAtomsDriftState || null,
    activeAtomsDriftReason: current.activeAtomsDriftReason || null,
    ...mapHealthSummaryConnectionSignals(current),
    ...mapHealthSummaryPropagationSignals(current),
    healthArchive: current.healthArchive || null
  };
}

export function mapHealthSummary(current = {}) {
  return {
    ...mapHealthSummaryCore(current),
    ...mapHealthSummarySignals(current)
  };
}

export function mapTrendSummary(trend = {}) {
  return {
    status: trend.status || 'missing',
    summary: trend.summary || null,
    progressScore: asNumber(trend.progressScore, 0),
    velocityPerDay: asNumber(trend.velocityPerDay, 0),
    improvingStreak: trend.improvingStreak === true,
    behaviorTrend: asNumber(trend.behaviorTrend, 0),
    daysSincePrevious: asNumber(trend.daysSincePrevious, 0),
    daysSinceBaseline: asNumber(trend.daysSinceBaseline, 0)
  };
}

export function mapMetricsSummary(current = {}, pipelineTimingTelemetry = null) {
  return {
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
  };
}

export function mapSessionsSummary(current = {}) {
  if (!current.mcpSessionSummary) {
    return null;
  }

  return {
    summary: current.mcpSessionSummary.summary || null,
    clientSyncState: current.mcpSessionSummary.clientSyncState || null,
    clientSyncReason: current.mcpSessionSummary.clientSyncReason || null,
    clientSyncRecommendation: current.mcpSessionSummary.clientSyncRecommendation || null,
    clientSyncSummary: current.mcpSessionSummary.clientSyncSummary || null
  };
}

export function mapRecentErrorsSummary(recentErrors = null) {
  if (!recentErrors) {
    return null;
  }

  return {
    total: asNumber(recentErrors?.summary?.total, 0),
    warnings: asNumber(recentErrors?.summary?.warnings, 0),
    errors: asNumber(recentErrors?.summary?.errors, 0),
    logs: takeSample(recentErrors?.logs || [], 3)
  };
}

export function mapHistorySummary(history = {}) {
  return {
    total: Array.isArray(history?.entries) ? history.entries.length : 0,
    latestCapturedAt: history?.latest?.capturedAt || null,
    previousCapturedAt: history?.previous?.capturedAt || null,
    baselineCapturedAt: history?.baseline?.capturedAt || null
  };
}

export function buildHealthPanelNowSummary(now = {}) {
  return {
    globalHealthScore: now.globalHealthScore || now.healthScore || 0,
    globalHealthGrade: now.globalHealthGrade || now.healthGrade || 'F',
    healthScore: now.healthScore || 0,
    healthGrade: now.healthGrade || 'F',
    reliabilityScore: now.reliabilityScore || 0,
    reliabilityGrade: now.reliabilityGrade || 'F',
    reliabilityState: now.reliabilityState || null,
    successScore: now.successScore || 0,
    successThreshold: now.successThreshold || 0,
    mvpReady: now.mvpReady === true,
    behaviorState: now.behaviorState || null,
    driftState: now.driftState || null,
    driftScore: now.driftScore || 0,
    stabilityScore: now.stabilityScore || 0,
    activeAtomsDriftState: now.activeAtomsDriftState || null,
    activeAtomsDriftReason: now.activeAtomsDriftReason || null,
    clientSyncState: now.clientSyncState || null,
    clientSyncSeverity: now.clientSyncSeverity || null,
    clientSyncReason: now.clientSyncReason || null,
    clientSyncRecommendation: now.clientSyncRecommendation || null,
    propagationExpansionState: now.propagationExpansionState || null,
    propagationExpansionReason: now.propagationExpansionReason || null,
    propagationExpansionRecommendation: now.propagationExpansionRecommendation || null,
    activeAtomsDelta: asNumber(now.activeAtomsDelta, 0),
    activeAtomsDeltaPct: asNumber(now.activeAtomsDeltaPct, 0)
  };
}

export function buildHealthPanelOneLine(now = {}, compact = {}, perf = null, tools = {}, lifetime = null) {
  return [
    `now=${now.globalHealthScore || now.healthScore || 0}/${now.globalHealthGrade || now.healthGrade || 'F'}`,
    `db=${now.healthScore || 0}/${now.healthGrade || 'F'}`,
    `trust=${Math.round(now.reliabilityScore || 0)}/${now.reliabilityGrade || 'F'}`,
    `trend=${compact.trend?.status || 'missing'}:${compact.trend?.velocityPerDay || 0}/day`,
    `dbsync=${now.activeAtomsDriftState || 'missing'}`,
    now.propagationExpansionState ? `propagation=${now.propagationExpansionState}` : null,
    now.clientSyncState && now.clientSyncState !== 'fresh' ? `clientsync=${now.clientSyncState}` : null,
    perf?.status ? `perf=${perf.status}:${Math.round(perf.current?.totalDurationMs || 0)}ms` : null,
    tools?.totalRuns > 0 ? `tools=${tools.successfulRuns || 0}/${tools.totalRuns} ok` : 'tools=0',
    tools?.pressureRuns > 0 ? `repair=${tools.repairedRuns || 0}/${tools.pressureRuns}` : null,
    tools?.noiseSummary?.noisyToolCount > 0 ? `noise=${tools.noiseSummary.noisyToolCount}/${Math.round(tools.noiseSummary.noiseScore || 0)}` : null,
    lifetime?.daysObserved ? `life=${lifetime.daysObserved}d avg=${Math.round(lifetime.averageHealthScore || 0)}` : null,
    `ready=${now.mvpReady ? 'yes' : 'no'}`
  ].filter(Boolean).join(' | ');
}

function buildDashboardIdentitySummary(dashboard = {}) {
  return {
    projectPath: dashboard.projectPath || null,
    scopePath: dashboard.scopePath || null,
    focusPath: dashboard.focusPath || null,
    snapshotKind: dashboard.snapshotKind || 'status',
    captureSource: dashboard.captureSource || null,
    capturedAt: dashboard.capturedAt || null
  };
}

function buildDashboardArchiveSummary(dashboard = {}) {
  return {
    daily: dashboard.daily || null,
    lifetime: dashboard.lifetime || dashboard.archive || dashboard.healthArchive || null,
    archive: mapArchiveSummary(dashboard.archive || null)
  };
}

function buildDashboardHealthSummary(dashboard = {}) {
  return {
    status: dashboard.status || null,
    health: dashboard.health ? mapHealthSummary(dashboard.health) : null,
    trend: dashboard.trend ? { ...dashboard.trend } : null
  };
}

function buildDashboardCollectionsSummary(dashboard = {}) {
  return {
    performance: dashboard.pipelineTimingTelemetry || null,
    metrics: dashboard.metrics ? mapMetricsSummary(dashboard.metrics, dashboard.pipelineTimingTelemetry || null) : null,
    sessions: mapSessionsSummary(dashboard),
    toolTelemetry: dashboard.toolTelemetry ? { ...dashboard.toolTelemetry } : null,
    metricDictionary: dashboard.metricDictionary || null,
    pipelineTimingTelemetry: dashboard.pipelineTimingTelemetry || null
  };
}

function buildDashboardSignalsSummary(dashboard = {}) {
  return {
    regressors: takeSample(dashboard.regressors || [], 5),
    improvements: takeSample(dashboard.improvements || [], 5),
    recommendations: takeSample(dashboard.recommendations || [], 5),
    watcherAlerts: takeSample(dashboard.watcherAlerts || [], 5),
    recentErrors: mapRecentErrorsSummary(dashboard.recentErrors || null),
    history: mapHistorySummary(dashboard.history || {}),
    summary: dashboard.summary || null
  };
}

export function summarizeCompilerHealthDashboard(dashboard = null) {
  if (!dashboard || typeof dashboard !== 'object') {
    return null;
  }

  return {
    ...buildDashboardIdentitySummary(dashboard),
    ...buildDashboardArchiveSummary(dashboard),
    ...buildDashboardHealthSummary(dashboard),
    ...buildDashboardCollectionsSummary(dashboard),
    ...buildDashboardSignalsSummary(dashboard)
  };
}

export function summarizeCompilerHealthPanel(panel = null) {
  if (!panel || typeof panel !== 'object') {
    return null;
  }

  return {
    ...buildPanelIdentity(panel),
    ...buildPanelSections(panel),
    ...buildPanelHighlights(panel)
  };
}

export default {
  mapHealthSummary,
  mapTrendSummary,
  mapMetricsSummary,
  mapSessionsSummary,
  mapRecentErrorsSummary,
  mapHistorySummary,
  buildHealthPanelNowSummary,
  buildHealthPanelOneLine,
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel
};
