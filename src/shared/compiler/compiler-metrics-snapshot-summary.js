/**
 * Compact snapshot summary helpers for compiler metrics.
 */

import { takeSample } from './sample-helpers.js';
import {
  buildMetricsSnapshotDaily,
  buildMetricsSnapshotIdentity,
  buildMetricsSnapshotLifetime
} from './compiler-metrics-snapshot-summary-helpers.js';

function valueOr(value, fallback) {
  return value ?? fallback;
}

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

export function summarizeCompactToolTelemetry(toolTelemetry = null) {
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
    folderizationPropagation: toolTelemetry.folderizationPropagation || null,
    topTools: Array.isArray(toolTelemetry.topTools) ? toolTelemetry.topTools.slice(0, 5) : [],
    noiseSummary: toolTelemetry.noiseSummary ? {
      totalRuns: toolTelemetry.noiseSummary.totalRuns || 0,
      noisyRunCount: toolTelemetry.noiseSummary.noisyRunCount || 0,
      noisyToolCount: toolTelemetry.noiseSummary.noisyToolCount || 0,
      noiseRate: toolTelemetry.noiseSummary.noiseRate || 0,
      noiseScore: toolTelemetry.noiseSummary.noiseScore || 0,
      noiseTopTools: Array.isArray(toolTelemetry.noiseSummary.noiseTopTools) ? toolTelemetry.noiseSummary.noiseTopTools.slice(0, 5) : [],
      topReasons: Array.isArray(toolTelemetry.noiseSummary.topReasons) ? toolTelemetry.noiseSummary.topReasons.slice(0, 5) : []
    } : null
  };
}

function summarizeCompactCurrentScores(current = {}) {
  return {
    globalHealthScore: valueOr(current.globalHealthScore, 0),
    globalHealthGrade: valueOr(current.globalHealthGrade, valueOr(current.healthGrade, 'F')),
    healthScore: valueOr(current.healthScore, 0),
    healthGrade: valueOr(current.healthGrade, 'F'),
    reliabilityScore: valueOr(current.reliabilityScore, 0),
    reliabilityGrade: valueOr(current.reliabilityGrade, 'F'),
    reliabilityState: valueOr(current.reliabilityState, null),
    successScore: valueOr(current.successScore, 0),
    successThreshold: valueOr(current.successThreshold, 0),
    mvpReady: valueOr(current.mvpReady, false),
    behaviorState: valueOr(current.behaviorState, null),
    readinessReason: valueOr(current.readinessReason, null),
    summaryText: valueOr(current.summaryText, null)
  };
}

function summarizeCompactCurrentStructure(current = {}) {
  return {
    issueCount: valueOr(current.issueCount, 0),
    structuralGroups: valueOr(current.structuralGroups, 0),
    conceptualGroups: valueOr(current.conceptualGroups, 0),
    conceptualRawGroups: valueOr(current.conceptualRawGroups, 0),
    pipelineOrphans: valueOr(current.pipelineOrphans, 0),
    folderizationCandidateCount: valueOr(current.folderizationCandidateCount, 0),
    flatFamilies: valueOr(current.flatFamilies, 0),
    mixedFamilies: valueOr(current.mixedFamilies, 0),
    alreadyFolderizedFamilies: valueOr(current.alreadyFolderizedFamilies, 0),
    namingFamilies: valueOr(current.namingFamilies, 0),
    namingTargets: valueOr(current.namingTargets, 0),
    namingDebt: valueOr(current.namingDebt, 0),
    folderizationNormalization: valueOr(current.folderizationNormalization, null),
    folderizationPropagation: valueOr(current.folderizationPropagation, null)
  };
}

function summarizeCompactCurrentCoverage(current = {}) {
  return {
    liveCoverageRatio: valueOr(current.liveCoverageRatio, 0),
    metadataCoveragePct: valueOr(current.metadataCoveragePct, 0),
    metadataFieldCoveragePct: valueOr(current.metadataFieldCoveragePct, 0),
    dataGatewayTrustworthy: valueOr(current.dataGatewayTrustworthy, false),
    dataGatewayState: valueOr(current.dataGatewayState, null),
    activeAtoms: valueOr(current.activeAtoms, 0),
    zeroAtomFileCount: valueOr(current.zeroAtomFileCount, 0),
    callLinks: valueOr(current.callLinks, 0),
    semanticLinks: valueOr(current.semanticLinks, 0),
    watcherAlertCount: valueOr(current.watcherAlertCount, 0),
    recentWarningCount: valueOr(current.recentWarningCount, 0),
    recentErrorCount: valueOr(current.recentErrorCount, 0),
    phase2PendingFiles: valueOr(current.phase2PendingFiles, 0)
  };
}

function summarizeCompactCurrentConnections(current = {}) {
  return {
    mcpSessionSummary: valueOr(current.mcpSessionSummary, null),
    databaseTrustworthy: valueOr(current.databaseTrustworthy, false),
    clientSyncState: valueOr(current.clientSyncState, null),
    clientSyncSeverity: valueOr(current.clientSyncSeverity, null),
    clientSyncReason: valueOr(current.clientSyncReason, null),
    clientSyncRecommendation: valueOr(current.clientSyncRecommendation, null),
    healthArchive: valueOr(current.healthArchive, null)
  };
}

function summarizeCompactCurrentTelemetry(current = {}) {
  return {
    pipelineTimingTelemetry: summarizeCompactPipelineTimingTelemetry(current.pipelineTimingTelemetry),
    toolTelemetry: summarizeCompactToolTelemetry(current.toolTelemetry),
    startupTelemetry: current.startupTelemetry || null,
    systemInventory: current.systemInventory || null,
    canonicalPromotion: current.canonicalPromotion || null
  };
}

export function summarizeCompactCurrentSnapshot(current = null) {
  if (!current) {
    return null;
  }

  return {
    ...summarizeCompactCurrentScores(current),
    ...summarizeCompactCurrentStructure(current),
    ...summarizeCompactCurrentCoverage(current),
    ...summarizeCompactCurrentConnections(current),
    folderizationDecision: current.folderizationDecision || null,
    driftState: current.driftState || null,
    driftScore: current.driftScore || 0,
    stabilityScore: current.stabilityScore || 0,
    activeAtomsDriftState: current.activeAtomsDriftState || null,
    activeAtomsDriftReason: current.activeAtomsDriftReason || null,
    activeAtomsDelta: current.activeAtomsDelta || 0,
    activeAtomsDeltaPct: current.activeAtomsDeltaPct || 0,
    ...summarizeCompactCurrentTelemetry(current)
  };
}

export function summarizeCompactTrend(trend = null) {
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

export function summarizeCompactHistory(history = null) {
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

function buildCompilerMetricsSnapshotContent(snapshot) {
  const current = snapshot.current ?? null;
  const archiveSource = snapshot.healthArchive ?? current?.healthArchive ?? null;
  const daily = buildMetricsSnapshotDaily(snapshot, current);
  const lifetime = buildMetricsSnapshotLifetime(archiveSource);
  const archive = archiveSource ? { daily, lifetime } : null;

  return {
    ...buildMetricsSnapshotIdentity(snapshot, current),
    daily,
    lifetime,
    archive,
    normalization: current?.folderizationNormalization ?? null,
    propagation: current?.folderizationPropagation ?? null,
    canonicalPromotion: current?.canonicalPromotion ?? null,
    systemInventory: snapshot.systemInventory ?? snapshot.systemInventoryReport ?? current?.systemInventory ?? null,
    current: summarizeCompactCurrentSnapshot(current),
    trend: summarizeCompactTrend(snapshot.trend),
    history: summarizeCompactHistory(snapshot.history),
    healthArchive: archiveSource,
    metricDictionary: snapshot.metricDictionary ?? null,
    summary: snapshot.summary ?? null
  };
}

export function summarizeCompilerMetricsSnapshot(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  return buildCompilerMetricsSnapshotContent(snapshot);
}

export default {
  summarizeCompilerMetricsSnapshot
};
