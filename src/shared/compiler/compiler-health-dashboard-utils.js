/**
 * Shared helper mappers for compiler health dashboards.
 */

import { asNumber } from './core-utils.js';
import { mapArchiveSummary } from './compiler-health-dashboard-archive.js';
import { takeSample } from './sample-helpers.js';
import {
  buildHealthPanelNowSummary,
  buildHealthPanelOneLine,
  mapHealthSummary,
  mapHistorySummary,
  mapMetricsSummary,
  mapRecentErrorsSummary,
  mapSessionsSummary,
  mapTrendSummary,
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel
} from './summary.js';

export { asNumber, mapArchiveSummary };
export { takeSample };
export {
  buildHealthPanelNowSummary,
  buildHealthPanelOneLine,
  mapHealthSummary,
  mapHistorySummary,
  mapMetricsSummary,
  mapRecentErrorsSummary,
  mapSessionsSummary,
  mapTrendSummary,
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel
};

function buildEmptySnapshot() {
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

function buildSnapshotFromStructuredSource(snapshot) {
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

function buildSnapshotFromFlatSource(snapshot) {
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

export function normalizeSnapshot(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') {
    return buildEmptySnapshot();
  }

  if (snapshot.current || snapshot.trend || snapshot.history) {
    return buildSnapshotFromStructuredSource(snapshot);
  }

  return buildSnapshotFromFlatSource(snapshot);
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
    topTools: takeSample(toolTelemetry.topTools || [], 5),
    noiseSummary: toolTelemetry.noiseSummary ? {
      totalRuns: asNumber(toolTelemetry.noiseSummary.totalRuns, 0),
      noisyRunCount: asNumber(toolTelemetry.noiseSummary.noisyRunCount, 0),
      noisyToolCount: asNumber(toolTelemetry.noiseSummary.noisyToolCount, 0),
      noiseRate: asNumber(toolTelemetry.noiseSummary.noiseRate, 0),
      noiseScore: asNumber(toolTelemetry.noiseSummary.noiseScore, 0),
      noiseTopTools: takeSample(toolTelemetry.noiseSummary.noiseTopTools || [], 5),
      topReasons: takeSample(toolTelemetry.noiseSummary.topReasons || [], 5)
    } : null,
    cachePolicySummary: toolTelemetry.cachePolicySummary ? {
      totalTools: asNumber(toolTelemetry.cachePolicySummary.totalTools, 0),
      tierCounts: {
        live: asNumber(toolTelemetry.cachePolicySummary.tierCounts?.live, 0),
        fingerprintCache: asNumber(toolTelemetry.cachePolicySummary.tierCounts?.fingerprintCache, 0),
        snapshotCache: asNumber(toolTelemetry.cachePolicySummary.tierCounts?.snapshotCache, 0),
        ttlCache: asNumber(toolTelemetry.cachePolicySummary.tierCounts?.ttlCache, 0)
      },
      topTools: takeSample(toolTelemetry.cachePolicySummary.topTools || [], 5),
      defaultPolicy: toolTelemetry.cachePolicySummary.defaultPolicy || null
    } : null
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

export default {
  asNumber,
  takeSample,
  normalizeSnapshot,
  mapToolTelemetry,
  mapPipelineTimingTelemetry,
  mapArchiveSummary,
  buildHealthPanelNowSummary,
  buildHealthPanelOneLine,
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel,
  mapHealthSummary,
  mapTrendSummary,
  mapMetricsSummary,
  mapSessionsSummary,
  mapRecentErrorsSummary,
  mapHistorySummary
};
