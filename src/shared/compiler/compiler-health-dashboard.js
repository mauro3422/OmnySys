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
  push(snapshot?.current?.clientSyncRecommendation, 'clientSync');
  push(snapshot?.current?.pipelineTimingTelemetry?.summary, 'pipelineTiming');
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
  const pipelineTimingTelemetry = current.pipelineTimingTelemetry ? {
    projectPath: current.pipelineTimingTelemetry.projectPath || null,
    runKind: current.pipelineTimingTelemetry.runKind || 'pipeline',
    status: current.pipelineTimingTelemetry.status || current.pipelineTimingTelemetry.performanceState || 'unknown',
    performanceState: current.pipelineTimingTelemetry.performanceState || null,
    performanceScore: asNumber(current.pipelineTimingTelemetry.performanceScore, 0),
    capturedAt: current.pipelineTimingTelemetry.capturedAt || null,
    current: current.pipelineTimingTelemetry.current ? {
      totalDurationMs: asNumber(current.pipelineTimingTelemetry.current.totalDurationMs, 0),
      averagePhaseMs: asNumber(current.pipelineTimingTelemetry.current.averagePhaseMs, 0),
      phaseCount: asNumber(current.pipelineTimingTelemetry.current.phaseCount, 0),
      slowPhaseCount: asNumber(current.pipelineTimingTelemetry.current.slowPhaseCount, 0),
      maxPhaseName: current.pipelineTimingTelemetry.current.maxPhaseName || null,
      maxPhaseMs: asNumber(current.pipelineTimingTelemetry.current.maxPhaseMs, 0),
      summaryText: current.pipelineTimingTelemetry.current.summaryText || null
    } : null,
    trend: current.pipelineTimingTelemetry.trend || null,
    history: current.pipelineTimingTelemetry.history || null,
    summary: current.pipelineTimingTelemetry.summary || null,
    oneLine: current.pipelineTimingTelemetry.oneLine || null
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
      stabilityScore: dashboard.health.stabilityScore,
      activeAtomsDriftState: dashboard.health.activeAtomsDriftState || null,
      activeAtomsDriftReason: dashboard.health.activeAtomsDriftReason || null,
      clientSyncState: dashboard.health.clientSyncState || null,
      clientSyncSeverity: dashboard.health.clientSyncSeverity || null,
      clientSyncReason: dashboard.health.clientSyncReason || null,
      clientSyncRecommendation: dashboard.health.clientSyncRecommendation || null,
      activeAtomsDelta: dashboard.health.activeAtomsDelta || 0,
      activeAtomsDeltaPct: dashboard.health.activeAtomsDeltaPct || 0
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
    performance: dashboard.pipelineTimingTelemetry ? {
      projectPath: dashboard.pipelineTimingTelemetry.projectPath || null,
      runKind: dashboard.pipelineTimingTelemetry.runKind || 'pipeline',
      status: dashboard.pipelineTimingTelemetry.status || null,
      performanceState: dashboard.pipelineTimingTelemetry.performanceState || null,
      performanceScore: dashboard.pipelineTimingTelemetry.performanceScore || 0,
      capturedAt: dashboard.pipelineTimingTelemetry.capturedAt || null,
      current: dashboard.pipelineTimingTelemetry.current || null,
      trend: dashboard.pipelineTimingTelemetry.trend || null,
      history: dashboard.pipelineTimingTelemetry.history || null,
      summary: dashboard.pipelineTimingTelemetry.summary || null,
      oneLine: dashboard.pipelineTimingTelemetry.oneLine || null
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
      activeAtoms: dashboard.metrics.activeAtoms,
      watcherAlertCount: dashboard.metrics.watcherAlertCount,
      recentWarningCount: dashboard.metrics.recentWarningCount,
      recentErrorCount: dashboard.metrics.recentErrorCount,
      phase2PendingFiles: dashboard.metrics.phase2PendingFiles
    } : null,
    sessions: dashboard.sessions ? {
      summary: dashboard.sessions.summary || null,
      clientSyncState: dashboard.sessions.clientSyncState || null,
      clientSyncReason: dashboard.sessions.clientSyncReason || null,
      clientSyncRecommendation: dashboard.sessions.clientSyncRecommendation || null,
      clientSyncSummary: dashboard.sessions.clientSyncSummary || null
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
    pipelineTimingTelemetry: dashboard.pipelineTimingTelemetry ? {
      projectPath: dashboard.pipelineTimingTelemetry.projectPath || null,
      runKind: dashboard.pipelineTimingTelemetry.runKind || 'pipeline',
      status: dashboard.pipelineTimingTelemetry.status || null,
      performanceState: dashboard.pipelineTimingTelemetry.performanceState || null,
      performanceScore: dashboard.pipelineTimingTelemetry.performanceScore || 0,
      capturedAt: dashboard.pipelineTimingTelemetry.capturedAt || null,
      current: dashboard.pipelineTimingTelemetry.current || null,
      trend: dashboard.pipelineTimingTelemetry.trend || null,
      history: dashboard.pipelineTimingTelemetry.history || null,
      summary: dashboard.pipelineTimingTelemetry.summary || null,
      oneLine: dashboard.pipelineTimingTelemetry.oneLine || null
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

export function buildCompilerHealthPanel(dashboard = null) {
  const compact = summarizeCompilerHealthDashboard(dashboard);
  if (!compact) {
    return null;
  }

  const topRegressors = takeSample(compact.regressors || [], 3);
  const topImprovements = takeSample(compact.improvements || [], 3);
  const topRecommendations = takeSample(compact.recommendations || [], 3);
  const now = compact.health || {};
  const tools = compact.toolTelemetry || {};
  const perf = compact.performance || {};

  return {
    projectPath: compact.projectPath,
    scopePath: compact.scopePath,
    focusPath: compact.focusPath,
    snapshotKind: compact.snapshotKind,
    captureSource: compact.captureSource,
    capturedAt: compact.capturedAt,
    status: compact.status,
    headline: `${now.healthGrade || 'F'} ${Math.round(now.healthScore || 0)}/${Math.round(now.successThreshold || 0)} ${now.mvpReady ? 'ready' : now.behaviorState || 'unknown'}`,
    now: {
      healthScore: now.healthScore || 0,
      healthGrade: now.healthGrade || 'F',
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
      activeAtomsDeltaPct: asNumber(now.activeAtomsDeltaPct, 0),
      readinessReason: now.readinessReason || null
    },
    trend: compact.trend ? {
      status: compact.trend.status,
      progressScore: compact.trend.progressScore,
      velocityPerDay: compact.trend.velocityPerDay,
      improvingStreak: compact.trend.improvingStreak,
      behaviorTrend: compact.trend.behaviorTrend,
      summary: compact.trend.summary
    } : null,
    performance: perf ? {
      status: perf.status || perf.performanceState || null,
      performanceState: perf.performanceState || null,
      performanceScore: perf.performanceScore || 0,
      capturedAt: perf.capturedAt || null,
      current: perf.current || null,
      trend: perf.trend || null,
      summary: perf.summary || null
    } : null,
    tools: tools ? {
      totalRuns: tools.totalRuns || 0,
      toolSuccessRate: tools.toolSuccessRate || 0,
      repairYield: tools.repairYield || 0,
      alertClearanceRate: tools.alertClearanceRate || 0,
      errorClearanceRate: tools.errorClearanceRate || 0,
      averageDurationMs: tools.averageDurationMs || 0,
      topTools: takeSample(tools.topTools || [], 3)
    } : null,
    topRegressors,
    topImprovements,
    topRecommendations,
    nextAction: topRecommendations[0]?.value || now.clientSyncRecommendation || now.readinessReason || compact.summary || null,
    summary: compact.summary || null,
    oneLine: [
      `now=${now.healthScore || 0}/${now.healthGrade || 'F'}`,
      `trend=${compact.trend?.status || 'missing'}:${compact.trend?.velocityPerDay || 0}/day`,
      `dbsync=${now.activeAtomsDriftState || 'missing'}`,
      now.clientSyncState && now.clientSyncState !== 'fresh'
        ? `clientsync=${now.clientSyncState}`
        : null,
      perf?.status
        ? `perf=${perf.status}:${Math.round(perf.current?.totalDurationMs || 0)}ms`
        : null,
      `tools=${tools?.repairYield || 0}`,
      `ready=${now.mvpReady ? 'yes' : 'no'}`
    ].filter(Boolean).join(' | ')
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
    topRegressors: takeSample(panel.topRegressors || [], 3),
    topImprovements: takeSample(panel.topImprovements || [], 3),
    topRecommendations: takeSample(panel.topRecommendations || [], 3),
    nextAction: panel.nextAction || null,
    summary: panel.summary || null,
    oneLine: panel.oneLine || null
  };
}

export default {
  buildCompilerHealthDashboard,
  summarizeCompilerHealthDashboard,
  buildCompilerHealthPanel,
  summarizeCompilerHealthPanel
};
