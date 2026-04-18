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
} from './helpers.js';
import {
  buildArchiveDaily,
  buildArchiveLifetime,
  buildHealthSection,
  buildHistorySection,
  buildLifetime,
  buildMetricsSection,
  buildSessionsSection,
  buildTrendSection
} from './dashboard-sections.js';
import { loadCompilerMetricsArchiveHistory } from './compiler-health-archive.js';
import { buildArchiveWindowDrift } from './archive-window-drift.js';
import { resolveDashboardControlPlaneContracts } from './status-summary/index.js';

// Keep the coordinator thin so the watcher stays below the dangerous size threshold.

function buildCompilerHealthDashboardContext(snapshot = null, compilerExplainability = null, options = {}) {
  const normalized = normalizeSnapshot(snapshot);
  const current = normalized.current || {};
  const trend = normalized.trend || {};
  const history = normalized.history || {};
  const watcherAlerts = Array.isArray(options.watcherAlerts) ? options.watcherAlerts : [];
  const recentErrors = options.recentErrors || null;
  const controlPlaneContracts = resolveDashboardControlPlaneContracts(normalized, compilerExplainability);
  const folderizationPropagation = controlPlaneContracts.folderizationPropagation;
  const policyCoverage = controlPlaneContracts.policyCoverage;
  const propagationExpansion = controlPlaneContracts.propagationExpansion;
  const signalRows = buildSignalRows(trend.deltaSinceBaseline || {});
  const metricsArchive = normalized.projectPath
    ? loadCompilerMetricsArchiveHistory(normalized.projectPath, {
        snapshotKind: normalized.snapshotKind,
        scopePath: normalized.scopePath,
        focusPath: normalized.focusPath,
        limit: 12
      })
    : null;
  const toolTelemetry = {
    ...mapToolTelemetry(current.toolTelemetry),
    folderizationPropagation: folderizationPropagation ? { ...folderizationPropagation } : null
  };
  const pipelineTimingTelemetry = mapPipelineTimingTelemetry(current.pipelineTimingTelemetry);
  const healthArchive = normalized.healthArchive || null;
  const archiveDaily = healthArchive
    ? buildArchiveDaily(current, folderizationPropagation, policyCoverage, trend, normalized.capturedAt || current.capturedAt || null)
    : null;
  const archiveLifetime = healthArchive ? buildArchiveLifetime(healthArchive) : null;
  const archiveWindowDrift = buildArchiveWindowDrift(healthArchive, metricsArchive, history);
  const regressors = signalRows.filter((row) => row.impact < 0).slice(0, 5);
  const improvements = signalRows.filter((row) => row.impact > 0).slice(0, 5);

  return {
    normalized,
    current,
    trend,
    history,
    watcherAlerts,
    recentErrors,
    controlPlaneContracts,
    folderizationPropagation,
    policyCoverage,
    propagationExpansion,
    toolTelemetry,
    pipelineTimingTelemetry,
    healthArchive,
    metricsArchive,
    archiveWindowDrift,
    archiveDaily,
    archiveLifetime,
    regressors,
    improvements
  };
}

function buildCompilerHealthDashboardPayload(context, compilerExplainability) {
  const {
    normalized,
    current,
    trend,
    history,
    watcherAlerts,
    recentErrors,
    controlPlaneContracts,
    folderizationPropagation,
    policyCoverage,
    propagationExpansion,
    toolTelemetry,
    pipelineTimingTelemetry,
    healthArchive,
    metricsArchive,
    archiveWindowDrift,
    archiveDaily,
    archiveLifetime,
    regressors,
    improvements
  } = context;

  return {
    projectPath: normalized.projectPath || null,
    scopePath: normalized.scopePath || null,
    focusPath: normalized.focusPath || null,
    snapshotKind: normalized.snapshotKind || 'status',
    captureSource: normalized.captureSource || null,
    capturedAt: normalized.capturedAt || current.capturedAt || null,
    daily: {
      capturedAt: current.capturedAt || normalized.capturedAt || null,
      healthScore: asNumber(current.healthScore, 0),
      healthGrade: current.healthGrade || 'F',
      driftState: current.driftState || null,
      driftScore: asNumber(current.driftScore, 0),
      stabilityScore: asNumber(current.stabilityScore, 0),
      successScore: asNumber(current.successScore, 0),
      behaviorState: current.behaviorState || null,
      clientSyncState: current.clientSyncState || null,
      startupTelemetry: current.startupTelemetry ? { ...current.startupTelemetry } : null,
      folderizationPropagation: folderizationPropagation ? { ...folderizationPropagation } : null,
      canonicalPromotion: current.canonicalPromotion ? { ...current.canonicalPromotion } : null,
      policyCoverage: policyCoverage ? { ...policyCoverage } : null,
      propagationExpansionState: propagationExpansion?.state || null,
      propagationExpansionReason: propagationExpansion?.reason || null,
      propagationExpansionRecommendation: propagationExpansion?.recommendation || null,
      summary: current.summaryText || trend.summary || null
    },
    lifetime: buildLifetime(healthArchive),
    archive: healthArchive ? {
      daysObserved: healthArchive.daysObserved || 0,
      snapshotsRecorded: healthArchive.snapshotsRecorded || 0,
      firstCapturedAt: healthArchive.firstCapturedAt || null,
      lastCapturedAt: healthArchive.lastCapturedAt || null,
      averageHealthScore: healthArchive.averageHealthScore || 0,
      averageDriftScore: healthArchive.averageDriftScore || 0,
      averageStabilityScore: healthArchive.averageStabilityScore || 0,
      averageSuccessScore: healthArchive.averageSuccessScore || 0,
      totalIssueCount: healthArchive.totalIssueCount || 0,
      totalWarningCount: healthArchive.totalWarningCount || 0,
      totalErrorCount: healthArchive.totalErrorCount || 0,
      totalWatcherAlertCount: healthArchive.totalWatcherAlertCount || 0,
      latestHealthScore: healthArchive.latestHealthScore || 0,
      latestHealthGrade: healthArchive.latestHealthGrade || null,
      latestBehaviorState: healthArchive.latestBehaviorState || null,
      latestClientSyncState: healthArchive.latestClientSyncState || null,
      summary: healthArchive.summary || null,
      daily: archiveDaily,
      lifetime: archiveLifetime
    } : null,
    metricsArchive: metricsArchive ? {
      daysObserved: Array.isArray(metricsArchive.daily) ? metricsArchive.daily.length : 0,
      snapshotsRecorded: Array.isArray(metricsArchive.entries) ? metricsArchive.entries.length : 0,
      firstCapturedAt: metricsArchive.baseline?.capturedAt || metricsArchive.entries?.[metricsArchive.entries.length - 1]?.capturedAt || null,
      lastCapturedAt: metricsArchive.latest?.capturedAt || null,
      latestCapturedAt: metricsArchive.latest?.capturedAt || null,
      previousCapturedAt: metricsArchive.previous?.capturedAt || null,
      baselineCapturedAt: metricsArchive.baseline?.capturedAt || null,
      summary: metricsArchive.daily && metricsArchive.daily.length > 0
        ? `days=${metricsArchive.daily.length} | latest=${metricsArchive.latest?.captured_at || metricsArchive.latest?.capturedAt || 'n/a'}`
        : null
    } : null,
    archiveWindowDrift: archiveWindowDrift ? { ...archiveWindowDrift } : null,
    status: current.mvpReady ? 'ready' : current.behaviorState || trend.status || 'unknown',
    health: buildHealthSection(current, controlPlaneContracts, folderizationPropagation, policyCoverage, propagationExpansion),
    trend: buildTrendSection(trend),
    metrics: buildMetricsSection(current, controlPlaneContracts, pipelineTimingTelemetry),
    sessions: buildSessionsSection(current.mcpSessionSummary),
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
    history: buildHistorySection(history),
    summary: current.summaryText || trend.summary || null
  };
}

export function buildCompilerHealthDashboard(snapshot = null, compilerExplainability = null, options = {}) {
  const context = buildCompilerHealthDashboardContext(snapshot, compilerExplainability, options);
  return buildCompilerHealthDashboardPayload(context, compilerExplainability);
}

export const summarizeCompilerHealthDashboard = summarizeCompilerHealthDashboardDetails;
export const buildCompilerHealthPanel = buildCompilerHealthPanelDetails;
export const summarizeCompilerHealthPanel = summarizeCompilerHealthPanelDetails;

export default {
  buildCompilerHealthDashboard,
  summarizeCompilerHealthDashboard,
  buildCompilerHealthPanel,
  summarizeCompilerHealthPanel
};
