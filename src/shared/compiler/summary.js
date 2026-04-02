/**
 * Compact snapshot summary helpers for compiler metrics.
 */

export { getDatabaseHealthSummary } from './database-health-summary.js';

function summarizeCompactPipelineTimingTelemetry(telemetry = null) {
  if (!telemetry) {
    return null;
  }

  return {
    projectPath: telemetry.projectPath || null,
    runKind: telemetry.runKind || 'pipeline',
    status: telemetry.status || null,
    performanceState: telemetry.performanceState || null,
    performanceScore: telemetry.performanceScore || 0,
    capturedAt: telemetry.capturedAt || null,
    current: telemetry.current || null,
    trend: telemetry.trend || null,
    history: telemetry.history || null,
    summary: telemetry.summary || null,
    oneLine: telemetry.oneLine || null
  };
}

function summarizeCompactToolTelemetry(toolTelemetry = null) {
  if (!toolTelemetry) {
    return null;
  }

  const numericFields = [
    'totalRuns',
    'successfulRuns',
    'repairedRuns',
    'thrashingRuns',
    'comparableRuns',
    'observationRuns',
    'pressureRuns',
    'clearanceRuns',
    'repairYield',
    'repairRateOnPressure',
    'observationRate',
    'toolSuccessRate',
    'alertClearanceRate',
    'errorClearanceRate',
    'averageDurationMs',
    'averageRepairScore'
  ];

  const compact = Object.fromEntries(
    numericFields.map((field) => [field, toolTelemetry[field] || 0])
  );

  return {
    ...compact,
    lastRunAt: toolTelemetry.lastRunAt || null,
    lastSuccessfulRunAt: toolTelemetry.lastSuccessfulRunAt || null,
    topTools: Array.isArray(toolTelemetry.topTools) ? toolTelemetry.topTools.slice(0, 5) : []
  };
}

function summarizeCompactCurrentSnapshot(current = null) {
  if (!current) {
    return null;
  }

  return {
    globalHealthScore: current.globalHealthScore || 0,
    globalHealthGrade: current.globalHealthGrade || current.healthGrade || 'F',
    healthScore: current.healthScore || 0,
    healthGrade: current.healthGrade || 'F',
    reliabilityScore: current.reliabilityScore || 0,
    reliabilityGrade: current.reliabilityGrade || 'F',
    reliabilityState: current.reliabilityState || null,
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
    metadataCoveragePct: current.metadataCoveragePct || 0,
    metadataFieldCoveragePct: current.metadataFieldCoveragePct || 0,
    dataGatewayTrustworthy: current.dataGatewayTrustworthy || false,
    dataGatewayState: current.dataGatewayState || null,
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
    pipelineTimingTelemetry: summarizeCompactPipelineTimingTelemetry(current.pipelineTimingTelemetry),
    toolTelemetry: summarizeCompactToolTelemetry(current.toolTelemetry)
  };
}

function summarizeCompactTrend(trend = null) {
  if (!trend) {
    return null;
  }

  return {
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
  };
}

function summarizeCompactHistory(history = null) {
  if (!history) {
    return {
      total: 0,
      latestCapturedAt: null,
      previousCapturedAt: null,
      baselineCapturedAt: null,
      latest: null,
      previous: null,
      baseline: null
    };
  }

  return {
    total: Array.isArray(history.entries) ? history.entries.length : 0,
    latestCapturedAt: history.latest?.capturedAt || null,
    previousCapturedAt: history.previous?.capturedAt || null,
    baselineCapturedAt: history.baseline?.capturedAt || null,
    latest: history.latest || null,
    previous: history.previous || null,
    baseline: history.baseline || null
  };
}

export function summarizeCompilerMetricsSnapshot(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  return {
    projectPath: snapshot.projectPath || null,
    scopePath: snapshot.scopePath || null,
    focusPath: snapshot.focusPath || null,
    snapshotKind: snapshot.snapshotKind || 'status',
    captureSource: snapshot.captureSource || null,
    capturedAt: snapshot.current?.capturedAt || null,
    current: summarizeCompactCurrentSnapshot(snapshot.current),
    trend: summarizeCompactTrend(snapshot.trend),
    history: summarizeCompactHistory(snapshot.history),
    metricDictionary: snapshot.metricDictionary || null,
    summary: snapshot.summary || null
  };
}

export default {
  summarizeCompilerMetricsSnapshot
};
