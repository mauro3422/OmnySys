/**
 * Compiler health dashboard helpers.
 *
 * Builds a compact operational view on top of compiler metrics snapshots so
 * status and tools can expose health, readiness, velocity, regressions and
 * repair guidance from the same source of truth.
 */

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function takeSample(items = [], limit = 5) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(0, limit);
}

function normalizeSnapshot(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {
      projectPath: null,
      scopePath: null,
      focusPath: null,
      snapshotKind: 'status',
      captureSource: null,
      capturedAt: null,
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
    current: snapshot,
    trend: snapshot.trend || {},
    history: snapshot.history || {}
  };
}

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
  push(snapshot?.trend?.summary, 'trend');
  push(snapshot?.current?.readinessReason, 'readiness');

  return recommendations;
}

export function buildCompilerHealthDashboard(snapshot = null, compilerExplainability = null, options = {}) {
  const normalized = normalizeSnapshot(snapshot);
  const current = normalized.current || {};
  const trend = normalized.trend || {};
  const history = normalized.history || {};
  const watcherAlerts = Array.isArray(options.watcherAlerts) ? options.watcherAlerts : [];
  const recentErrors = options.recentErrors || null;
  const signalRows = buildSignalRows(trend.deltaSinceBaseline || {});

  const toolTelemetry = current.toolTelemetry ? {
    totalRuns: asNumber(current.toolTelemetry.totalRuns, 0),
    successfulRuns: asNumber(current.toolTelemetry.successfulRuns, 0),
    repairedRuns: asNumber(current.toolTelemetry.repairedRuns, 0),
    thrashingRuns: asNumber(current.toolTelemetry.thrashingRuns, 0),
    repairYield: asNumber(current.toolTelemetry.repairYield, 0),
    toolSuccessRate: asNumber(current.toolTelemetry.toolSuccessRate, 0),
    alertClearanceRate: asNumber(current.toolTelemetry.alertClearanceRate, 0),
    errorClearanceRate: asNumber(current.toolTelemetry.errorClearanceRate, 0),
    averageDurationMs: asNumber(current.toolTelemetry.averageDurationMs, 0),
    averageRepairScore: asNumber(current.toolTelemetry.averageRepairScore, 0),
    lastRunAt: current.toolTelemetry.lastRunAt || null,
    lastSuccessfulRunAt: current.toolTelemetry.lastSuccessfulRunAt || null,
    topTools: takeSample(current.toolTelemetry.topTools || [], 5)
  } : null;

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
      healthScore: asNumber(current.healthScore, 0),
      healthGrade: current.healthGrade || 'F',
      successScore: asNumber(current.successScore, 0),
      successThreshold: asNumber(current.successThreshold, 0),
      mvpReady: current.mvpReady === true,
      behaviorState: current.behaviorState || null,
      readinessReason: current.readinessReason || null,
      driftState: current.driftState || null,
      driftScore: asNumber(current.driftScore, 0),
      stabilityScore: asNumber(current.stabilityScore, 0)
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
      zeroAtomFileCount: asNumber(current.zeroAtomFileCount, 0),
      callLinks: asNumber(current.callLinks, 0),
      semanticLinks: asNumber(current.semanticLinks, 0),
      watcherAlertCount: asNumber(current.watcherAlertCount, 0),
      recentWarningCount: asNumber(current.recentWarningCount, 0),
      recentErrorCount: asNumber(current.recentErrorCount, 0),
      phase2PendingFiles: asNumber(current.phase2PendingFiles, 0)
    },
    toolTelemetry,
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
  if (!dashboard || typeof dashboard !== 'object') {
    return null;
  }

  return {
    projectPath: dashboard.projectPath || null,
    scopePath: dashboard.scopePath || null,
    focusPath: dashboard.focusPath || null,
    snapshotKind: dashboard.snapshotKind || 'status',
    captureSource: dashboard.captureSource || null,
    capturedAt: dashboard.capturedAt || null,
    status: dashboard.status || null,
    health: dashboard.health ? {
      healthScore: dashboard.health.healthScore,
      healthGrade: dashboard.health.healthGrade,
      successScore: dashboard.health.successScore,
      successThreshold: dashboard.health.successThreshold,
      mvpReady: dashboard.health.mvpReady,
      behaviorState: dashboard.health.behaviorState,
      readinessReason: dashboard.health.readinessReason,
      driftState: dashboard.health.driftState,
      driftScore: dashboard.health.driftScore,
      stabilityScore: dashboard.health.stabilityScore
    } : null,
    trend: dashboard.trend ? {
      status: dashboard.trend.status,
      summary: dashboard.trend.summary,
      progressScore: dashboard.trend.progressScore,
      velocityPerDay: dashboard.trend.velocityPerDay,
      improvingStreak: dashboard.trend.improvingStreak,
      behaviorTrend: dashboard.trend.behaviorTrend,
      daysSincePrevious: dashboard.trend.daysSincePrevious,
      daysSinceBaseline: dashboard.trend.daysSinceBaseline
    } : null,
    metrics: dashboard.metrics ? {
      issueCount: dashboard.metrics.issueCount,
      structuralGroups: dashboard.metrics.structuralGroups,
      conceptualGroups: dashboard.metrics.conceptualGroups,
      pipelineOrphans: dashboard.metrics.pipelineOrphans,
      folderizationCandidateCount: dashboard.metrics.folderizationCandidateCount,
      flatFamilies: dashboard.metrics.flatFamilies,
      mixedFamilies: dashboard.metrics.mixedFamilies,
      alreadyFolderizedFamilies: dashboard.metrics.alreadyFolderizedFamilies,
      namingFamilies: dashboard.metrics.namingFamilies,
      namingTargets: dashboard.metrics.namingTargets,
      namingDebt: dashboard.metrics.namingDebt,
      liveCoverageRatio: dashboard.metrics.liveCoverageRatio,
      watcherAlertCount: dashboard.metrics.watcherAlertCount,
      recentWarningCount: dashboard.metrics.recentWarningCount,
      recentErrorCount: dashboard.metrics.recentErrorCount,
      phase2PendingFiles: dashboard.metrics.phase2PendingFiles
    } : null,
    toolTelemetry: dashboard.toolTelemetry ? {
      totalRuns: dashboard.toolTelemetry.totalRuns,
      successfulRuns: dashboard.toolTelemetry.successfulRuns,
      repairedRuns: dashboard.toolTelemetry.repairedRuns,
      thrashingRuns: dashboard.toolTelemetry.thrashingRuns,
      repairYield: dashboard.toolTelemetry.repairYield,
      toolSuccessRate: dashboard.toolTelemetry.toolSuccessRate,
      alertClearanceRate: dashboard.toolTelemetry.alertClearanceRate,
      errorClearanceRate: dashboard.toolTelemetry.errorClearanceRate,
      averageDurationMs: dashboard.toolTelemetry.averageDurationMs,
      averageRepairScore: dashboard.toolTelemetry.averageRepairScore,
      lastRunAt: dashboard.toolTelemetry.lastRunAt,
      lastSuccessfulRunAt: dashboard.toolTelemetry.lastSuccessfulRunAt,
      topTools: takeSample(dashboard.toolTelemetry.topTools || [], 5)
    } : null,
    regressors: takeSample(dashboard.regressors || [], 5),
    improvements: takeSample(dashboard.improvements || [], 5),
    recommendations: takeSample(dashboard.recommendations || [], 5),
    watcherAlerts: takeSample(dashboard.watcherAlerts || [], 5),
    recentErrors: dashboard.recentErrors ? {
      total: dashboard.recentErrors.total,
      warnings: dashboard.recentErrors.warnings,
      errors: dashboard.recentErrors.errors,
      logs: takeSample(dashboard.recentErrors.logs || [], 3)
    } : null,
    history: dashboard.history || null,
    summary: dashboard.summary || null
  };
}

export default {
  buildCompilerHealthDashboard,
  summarizeCompilerHealthDashboard
};
