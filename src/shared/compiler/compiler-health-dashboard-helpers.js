/**
 * @fileoverview Helper mappers for compiler health dashboards.
 *
 * Keeps the main dashboard module focused on orchestration rather than
 * repeated normalization and section assembly.
 */

import {
  asNumber,
  buildHealthPanelNowSummary,
  buildHealthPanelOneLine,
  mapArchiveSummary,
  mapHealthSummary,
  mapHistorySummary,
  mapMetricsSummary,
  mapPipelineTimingTelemetry,
  mapRecentErrorsSummary,
  mapSessionsSummary,
  mapToolTelemetry,
  normalizeSnapshot,
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel,
  takeSample
} from './compiler-health-dashboard-utils.js';

function buildSignalRows(delta = {}) {
  const weights = {
    healthScore: 1,
    issueCount: -1,
    structuralGroups: -3,
    conceptualGroups: -3,
    pipelineOrphans: -5,
    namingTargets: -0.15,
    namingDebt: -0.15,
    flatFamilies: -0.5,
    liveCoverageRatio: 100,
    recentErrorCount: -5,
    recentWarningCount: -1,
    watcherAlertCount: -2,
    phase2PendingFiles: -1,
    alreadyFolderizedFamilies: 0.5
  };

  return Object.entries(weights)
    .map(([metric, weight]) => {
      const deltaValue = asNumber(delta?.[metric], 0);
      const impact = Number((deltaValue * weight).toFixed(2));

      return {
        metric,
        delta: Number(deltaValue.toFixed(2)),
        impact,
        direction: impact > 0 ? 'improvement' : impact < 0 ? 'regression' : 'flat',
        magnitude: Math.abs(impact)
      };
    })
    .filter((row) => row.impact !== 0)
    .sort((left, right) => right.magnitude - left.magnitude);
}

function buildRecommendations(snapshot = {}, compilerExplainability = {}) {
  const recommendations = [];
  const push = (value, source) => {
    if (!value || recommendations.some((item) => item.value === value)) {
      return;
    }

    recommendations.push({ source, value });
  };

  push(compilerExplainability?.databaseHealth?.summary?.nextAction, 'databaseHealth');
  push(compilerExplainability?.compilerContractLayer?.summary?.nextAction, 'compilerContractLayer');
  push(compilerExplainability?.metadataExtractionCoverage?.summary?.nextAction, 'metadataExtractionCoverage');
  push(compilerExplainability?.dataGatewayContract?.summary?.nextAction, 'dataGatewayContract');
  push(compilerExplainability?.folderization?.creationGuidance?.guidance, 'folderization');
  push(snapshot?.current?.clientSyncRecommendation, 'clientSync');
  push(snapshot?.current?.pipelineTimingTelemetry?.summary, 'pipelineTiming');
  push(snapshot?.trend?.summary, 'trend');
  push(snapshot?.current?.readinessReason, 'readiness');

  return recommendations;
}

function buildHealthPanelHeadline(now = {}, compact = {}) {
  return `${now.globalHealthGrade || now.healthGrade || 'F'} ${Math.round(now.globalHealthScore || now.healthScore || 0)}/${Math.round(now.successThreshold || 0)} ${now.mvpReady ? 'ready' : now.behaviorState || 'unknown'}`;
}

function buildHealthPanelSelections(compact = {}) {
  const topRegressors = takeSample(compact.regressors || [], 3);
  const topImprovements = takeSample(compact.improvements || [], 3);
  const topRecommendations = takeSample(compact.recommendations || [], 3);

  return {
    topRegressors,
    topImprovements,
    topRecommendations,
    regressors: topRegressors,
    improvements: topImprovements,
    recommendations: topRecommendations,
    nextAction: topRecommendations[0]?.value || null
  };
}

function buildHealthPanelSnapshots(compact = {}) {
  const lifetime = compact.lifetime || compact.archive || null;

  return {
    daily: compact.daily || null,
    lifetime,
    archive: compact.archive || null,
    oneLine: buildHealthPanelOneLine(compact.health || {}, compact, compact.performance || {}, compact.toolTelemetry || {}, lifetime)
  };
}

function buildHealthPanelContext(compact = {}) {
  const now = compact.health || {};
  const selections = buildHealthPanelSelections(compact);
  const snapshots = buildHealthPanelSnapshots(compact);

  return {
    now,
    selections,
    snapshots,
    nextAction:
      selections.nextAction
      || now.clientSyncRecommendation
      || now.readinessReason
      || compact.summary
      || null
  };
}

export function buildCompilerHealthPanel(dashboard = null) {
  const compact = summarizeCompilerHealthDashboard(dashboard);
  if (!compact) {
    return null;
  }

  const context = buildHealthPanelContext(compact);
  const now = context.now;
  const tools = compact.toolTelemetry || {};
  const perf = compact.performance || {};

  return {
    projectPath: compact.projectPath,
    scopePath: compact.scopePath,
    focusPath: compact.focusPath,
    snapshotKind: compact.snapshotKind,
    captureSource: compact.captureSource,
    capturedAt: compact.capturedAt,
    daily: context.snapshots.daily,
    lifetime: context.snapshots.lifetime,
    status: compact.status,
    headline: buildHealthPanelHeadline(now, compact),
    now: buildHealthPanelNowSummary(now),
    trend: compact.trend || null,
    performance: perf || null,
    metrics: compact.metrics || null,
    sessions: compact.sessions || null,
    toolTelemetry: tools || null,
    metricDictionary: compact.metricDictionary || null,
    archive: context.snapshots.archive || null,
    pipelineTimingTelemetry: compact.pipelineTimingTelemetry || null,
    regressors: context.selections.regressors,
    improvements: context.selections.improvements,
    recommendations: context.selections.recommendations,
    topRegressors: context.selections.topRegressors,
    topImprovements: context.selections.topImprovements,
    topRecommendations: context.selections.topRecommendations,
    nextAction: context.nextAction,
    watcherAlerts: takeSample(compact.watcherAlerts || [], 3),
    recentErrors: compact.recentErrors || null,
    history: compact.history || null,
    summary: compact.summary || null,
    oneLine: context.snapshots.oneLine
  };
}

export {
  asNumber,
  buildHealthPanelNowSummary,
  buildHealthPanelOneLine,
  buildRecommendations,
  buildSignalRows,
  mapArchiveSummary,
  mapHealthSummary,
  mapHistorySummary,
  mapMetricsSummary,
  mapPipelineTimingTelemetry,
  mapRecentErrorsSummary,
  mapSessionsSummary,
  mapToolTelemetry,
  normalizeSnapshot,
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel,
  takeSample
};

export default {
  asNumber,
  buildHealthPanelNowSummary,
  buildHealthPanelOneLine,
  buildRecommendations,
  buildSignalRows,
  mapArchiveSummary,
  mapHealthSummary,
  mapHistorySummary,
  mapMetricsSummary,
  mapPipelineTimingTelemetry,
  mapRecentErrorsSummary,
  mapSessionsSummary,
  mapToolTelemetry,
  normalizeSnapshot,
  summarizeCompilerHealthDashboard,
  buildCompilerHealthPanel,
  summarizeCompilerHealthPanel,
  takeSample
};
