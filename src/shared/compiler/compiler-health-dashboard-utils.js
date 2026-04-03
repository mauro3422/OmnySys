/**
 * @fileoverview Shared helper mappers for compiler health dashboards.
 */

import { asNumber } from './core-utils.js';

export { asNumber };

export function takeSample(items = [], limit = 5) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(0, limit);
}

export function normalizeSnapshot(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {
      projectPath: null,
      scopePath: null,
      focusPath: null,
      snapshotKind: 'status',
      captureSource: null,
      capturedAt: null,
      metricDictionary: null,
      healthArchive: null,
      daily: null,
      lifetime: null,
      current: {},
      trend: {},
      history: {}
    };
  }

  if (snapshot.current || snapshot.trend || snapshot.history) {
    return {
      projectPath: snapshot.projectPath || snapshot.current?.projectPath || null,
      scopePath: snapshot.scopePath || snapshot.current?.scopePath || null,
      focusPath: snapshot.focusPath || snapshot.current?.focusPath || null,
      snapshotKind: snapshot.snapshotKind || snapshot.current?.snapshotKind || 'status',
      captureSource: snapshot.captureSource || snapshot.current?.captureSource || null,
      capturedAt: snapshot.capturedAt || snapshot.current?.capturedAt || null,
      metricDictionary: snapshot.metricDictionary || null,
      healthArchive: snapshot.healthArchive || snapshot.current?.healthArchive || null,
      daily: snapshot.daily || null,
      lifetime: snapshot.lifetime || snapshot.archive || snapshot.healthArchive || snapshot.current?.healthArchive || null,
      current: snapshot.current || {},
      trend: snapshot.trend || {},
      history: snapshot.history || {}
    };
  }

  return {
    projectPath: snapshot.projectPath || null,
    scopePath: snapshot.scopePath || null,
    focusPath: snapshot.focusPath || null,
    snapshotKind: snapshot.snapshotKind || 'status',
    captureSource: snapshot.captureSource || null,
    capturedAt: snapshot.capturedAt || null,
    metricDictionary: snapshot.metricDictionary || null,
    healthArchive: snapshot.healthArchive || null,
    daily: snapshot.daily || null,
    lifetime: snapshot.lifetime || snapshot.archive || snapshot.healthArchive || null,
    current: snapshot,
    trend: snapshot.trend || {},
    history: snapshot.history || {}
  };
}

export function mapToolTelemetry(toolTelemetry = null) {
  if (!toolTelemetry) {
    return null;
  }

  return {
    totalRuns: asNumber(toolTelemetry.totalRuns, 0),
    successfulRuns: asNumber(toolTelemetry.successfulRuns, 0),
    repairedRuns: asNumber(toolTelemetry.repairedRuns, 0),
    thrashingRuns: asNumber(toolTelemetry.thrashingRuns, 0),
    comparableRuns: asNumber(toolTelemetry.comparableRuns, 0),
    observationRuns: asNumber(toolTelemetry.observationRuns, 0),
    pressureRuns: asNumber(toolTelemetry.pressureRuns, 0),
    clearanceRuns: asNumber(toolTelemetry.clearanceRuns, 0),
    repairYield: asNumber(toolTelemetry.repairYield, 0),
    repairRateOnPressure: asNumber(toolTelemetry.repairRateOnPressure, 0),
    observationRate: asNumber(toolTelemetry.observationRate, 0),
    toolSuccessRate: asNumber(toolTelemetry.toolSuccessRate, 0),
    alertClearanceRate: asNumber(toolTelemetry.alertClearanceRate, 0),
    errorClearanceRate: asNumber(toolTelemetry.errorClearanceRate, 0),
    averageDurationMs: asNumber(toolTelemetry.averageDurationMs, 0),
    averageRepairScore: asNumber(toolTelemetry.averageRepairScore, 0),
    lastRunAt: toolTelemetry.lastRunAt || null,
    lastSuccessfulRunAt: toolTelemetry.lastSuccessfulRunAt || null,
    topTools: takeSample(toolTelemetry.topTools || [], 5)
  };
}

export function mapPipelineTimingTelemetry(pipelineTimingTelemetry = null) {
  if (!pipelineTimingTelemetry) {
    return null;
  }

  return {
    projectPath: pipelineTimingTelemetry.projectPath || null,
    runKind: pipelineTimingTelemetry.runKind || 'pipeline',
    status: pipelineTimingTelemetry.status || pipelineTimingTelemetry.performanceState || 'unknown',
    performanceState: pipelineTimingTelemetry.performanceState || null,
    performanceScore: asNumber(pipelineTimingTelemetry.performanceScore, 0),
    capturedAt: pipelineTimingTelemetry.capturedAt || null,
    current: pipelineTimingTelemetry.current ? {
      totalDurationMs: asNumber(pipelineTimingTelemetry.current.totalDurationMs, 0),
      averagePhaseMs: asNumber(pipelineTimingTelemetry.current.averagePhaseMs, 0),
      phaseCount: asNumber(pipelineTimingTelemetry.current.phaseCount, 0),
      slowPhaseCount: asNumber(pipelineTimingTelemetry.current.slowPhaseCount, 0),
      maxPhaseName: pipelineTimingTelemetry.current.maxPhaseName || null,
      maxPhaseMs: asNumber(pipelineTimingTelemetry.current.maxPhaseMs, 0),
      summaryText: pipelineTimingTelemetry.current.summaryText || null
    } : null,
    trend: pipelineTimingTelemetry.trend || null,
    history: pipelineTimingTelemetry.history || null,
    summary: pipelineTimingTelemetry.summary || null,
    oneLine: pipelineTimingTelemetry.oneLine || null
  };
}

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
    clientSyncState: current.clientSyncState || null,
    clientSyncSeverity: current.clientSyncSeverity || null,
    clientSyncReason: current.clientSyncReason || null,
    clientSyncRecommendation: current.clientSyncRecommendation || null,
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

function mapArchiveDailySummary(daily = null) {
  if (!daily) {
    return null;
  }

  return {
    capturedAt: daily.capturedAt || null,
    globalHealthScore: asNumber(daily.globalHealthScore, asNumber(daily.healthScore, 0)),
    globalHealthGrade: daily.globalHealthGrade || daily.healthGrade || 'F',
    healthScore: asNumber(daily.healthScore, 0),
    healthGrade: daily.healthGrade || 'F',
    behaviorState: daily.behaviorState || null,
    driftState: daily.driftState || null,
    successScore: asNumber(daily.successScore, 0),
    issueCount: asNumber(daily.issueCount, 0),
    summary: daily.summary || null
  };
}

function mapArchiveLifetimeSummary(lifetime = null) {
  if (!lifetime) {
    return null;
  }

  return {
    daysObserved: asNumber(lifetime.daysObserved, 0),
    snapshotsRecorded: asNumber(lifetime.snapshotsRecorded, 0),
    firstCapturedAt: lifetime.firstCapturedAt || null,
    lastCapturedAt: lifetime.lastCapturedAt || null,
    averageHealthScore: asNumber(lifetime.averageHealthScore, 0),
    averageDriftScore: asNumber(lifetime.averageDriftScore, 0),
    averageStabilityScore: asNumber(lifetime.averageStabilityScore, 0),
    averageSuccessScore: asNumber(lifetime.averageSuccessScore, 0),
    totalIssueCount: asNumber(lifetime.totalIssueCount, 0),
    totalWarningCount: asNumber(lifetime.totalWarningCount, 0),
    totalErrorCount: asNumber(lifetime.totalErrorCount, 0),
    totalWatcherAlertCount: asNumber(lifetime.totalWatcherAlertCount, 0),
    latestHealthScore: asNumber(lifetime.latestHealthScore, 0),
    latestHealthGrade: lifetime.latestHealthGrade || null,
    latestBehaviorState: lifetime.latestBehaviorState || null,
    latestClientSyncState: lifetime.latestClientSyncState || null,
    summary: lifetime.summary || null
  };
}

export function mapArchiveSummary(archive = null) {
  if (!archive) {
    return null;
  }

  const daily = archive.daily || null;
  const lifetime = archive.lifetime || archive;

  return {
    daily: mapArchiveDailySummary(daily),
    lifetime: mapArchiveLifetimeSummary(lifetime),
    summary: archive.summary || lifetime?.summary || null
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
    now.clientSyncState && now.clientSyncState !== 'fresh' ? `clientsync=${now.clientSyncState}` : null,
    perf?.status ? `perf=${perf.status}:${Math.round(perf.current?.totalDurationMs || 0)}ms` : null,
    tools?.totalRuns > 0 ? `tools=${tools.successfulRuns || 0}/${tools.totalRuns} ok` : 'tools=0',
    tools?.pressureRuns > 0 ? `repair=${tools.repairedRuns || 0}/${tools.pressureRuns}` : null,
    lifetime?.daysObserved ? `life=${lifetime.daysObserved}d avg=${Math.round(lifetime.averageHealthScore || 0)}` : null,
    `ready=${now.mvpReady ? 'yes' : 'no'}`
  ].filter(Boolean).join(' | ');
}

export function summarizeCompilerHealthDashboard(dashboard = null) {
  if (!dashboard || typeof dashboard !== 'object') {
    return null;
  }

  const pipelineTimingTelemetry = dashboard.pipelineTimingTelemetry
    ? mapPipelineTimingTelemetry(dashboard.pipelineTimingTelemetry)
    : null;

  return {
    projectPath: dashboard.projectPath || null,
    scopePath: dashboard.scopePath || null,
    focusPath: dashboard.focusPath || null,
    snapshotKind: dashboard.snapshotKind || 'status',
    captureSource: dashboard.captureSource || null,
    capturedAt: dashboard.capturedAt || null,
    daily: dashboard.daily || null,
    lifetime: dashboard.lifetime || dashboard.archive || dashboard.healthArchive || null,
    archive: mapArchiveSummary(dashboard.archive || null),
    status: dashboard.status || null,
    health: dashboard.health ? mapHealthSummary(dashboard.health) : null,
    trend: dashboard.trend ? { ...dashboard.trend } : null,
    performance: pipelineTimingTelemetry,
    metrics: dashboard.metrics ? mapMetricsSummary(dashboard.metrics, pipelineTimingTelemetry) : null,
    sessions: mapSessionsSummary(dashboard),
    toolTelemetry: dashboard.toolTelemetry ? mapToolTelemetry(dashboard.toolTelemetry) : null,
    metricDictionary: dashboard.metricDictionary || null,
    pipelineTimingTelemetry,
    regressors: takeSample(dashboard.regressors || [], 5),
    improvements: takeSample(dashboard.improvements || [], 5),
    recommendations: takeSample(dashboard.recommendations || [], 5),
    watcherAlerts: takeSample(dashboard.watcherAlerts || [], 5),
    recentErrors: mapRecentErrorsSummary(dashboard.recentErrors || null),
    history: mapHistorySummary(dashboard.history || {}),
    summary: dashboard.summary || null
  };
}

export function summarizeCompilerHealthPanel(panel = null) {
  if (!panel || typeof panel !== 'object') {
    return null;
  }

  return {
    projectPath: panel.projectPath || null,
    scopePath: panel.scopePath || null,
    focusPath: panel.focusPath || null,
    snapshotKind: panel.snapshotKind || 'status',
    captureSource: panel.captureSource || null,
    capturedAt: panel.capturedAt || null,
    status: panel.status || null,
    headline: panel.headline || null,
    now: panel.now || null,
    trend: panel.trend || null,
    performance: panel.performance || null,
    tools: panel.tools || null,
    metricDictionary: panel.metricDictionary || null,
    archive: panel.archive || null,
    topRegressors: takeSample(panel.topRegressors || [], 3),
    topImprovements: takeSample(panel.topImprovements || [], 3),
    topRecommendations: takeSample(panel.topRecommendations || [], 3),
    nextAction: panel.nextAction || null,
    summary: panel.summary || null,
    oneLine: panel.oneLine || null
  };
}

export default {
  asNumber,
  takeSample,
  normalizeSnapshot,
  mapToolTelemetry,
  mapPipelineTimingTelemetry,
  mapHealthSummary,
  mapTrendSummary,
  mapMetricsSummary,
  mapSessionsSummary,
  mapRecentErrorsSummary,
  mapHistorySummary,
  mapArchiveSummary,
  buildHealthPanelNowSummary,
  buildHealthPanelOneLine,
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel
};
