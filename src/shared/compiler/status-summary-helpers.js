/**
 * Canonical compact helpers for MCP status summaries.
 */

import { normalizeCount } from './contract-helpers.js';
import {
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel
} from './compiler-health-dashboard.js';
import { takeSample } from './sample-helpers.js';

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function toCoveragePercent(value) {
  const normalized = Number(value) || 0;
  return Math.max(0, Math.min(100, Math.round(normalized <= 1 ? normalized * 100 : normalized)));
}

export function compactDatabaseHealth(databaseHealth) {
  if (!databaseHealth || typeof databaseHealth !== 'object') return databaseHealth;

  const metrics = databaseHealth.metrics || {};
  return {
    healthy: databaseHealth.healthy,
    healthScore: databaseHealth.healthScore,
    grade: databaseHealth.grade,
    summary: databaseHealth.summary,
    warnings: takeSample(databaseHealth.warnings || [], 2),
    criticalFindings: takeSample(databaseHealth.criticalFindings || [], 2),
    metrics: {
      scannedFiles: metrics.scannedFiles,
      activeFiles: metrics.activeFiles,
      activeAtoms: metrics.activeAtoms,
      orphanAtoms: metrics.orphanAtoms,
      atomsWithCalls: metrics.atomsWithCalls,
      atomsWithCalledBy: metrics.atomsWithCalledBy,
      activeCallRelations: metrics.activeCallRelations,
      activeSharesStateRelations: metrics.activeSharesStateRelations,
      callGraphRows: metrics.callGraphRows,
      orphanCallRelations: metrics.orphanCallRelations,
      activeRiskRows: metrics.activeRiskRows,
      contradictoryRiskRows: metrics.contradictoryRiskRows,
      activeSystemFiles: metrics.activeSystemFiles,
      systemFilesWithSemantics: metrics.systemFilesWithSemantics,
      activeSemanticConnections: metrics.activeSemanticConnections,
      semanticSurface: {
        fileLevelTotal: metrics.semanticSurface?.fileLevel?.total,
        atomLevelTotal: metrics.semanticSurface?.atomLevel?.total,
        derivedFrom: metrics.semanticSurface?.atomLevel?.derivedFrom,
        contract: {
          trustworthy: metrics.semanticSurface?.contract?.trustworthy,
          recommendedSourceOfTruth: metrics.semanticSurface?.contract?.recommendedSourceOfTruth,
          materiallyDrifting: metrics.semanticSurface?.materiallyDrifting
        }
      }
    }
  };
}

export function compactRepositoryDiagnostics(repositoryDiagnostics) {
  if (!repositoryDiagnostics || typeof repositoryDiagnostics !== 'object') return null;

  const status = repositoryDiagnostics.status || {};
  const journal = repositoryDiagnostics.journal || {};

  return {
    health: repositoryDiagnostics.health,
    projectPath: status.projectPath || null,
    ready: !!status.ready,
    initialized: !!status.initialized,
    dbOpen: !!status.dbOpen,
    reason: status.reason || null,
    queuedDurable: normalizeCount(repositoryDiagnostics.queuedDurable),
    issues: takeSample(repositoryDiagnostics.issues || [], 3),
    recommendations: takeSample(repositoryDiagnostics.recommendations || [], 3),
    journal: {
      queued: normalizeCount(journal.queued),
      entries: takeSample(journal.entries || [], 3)
    }
  };
}

export function compactCompilerHealthDashboardSummary(dashboard) {
  const compact = summarizeCompilerHealthDashboard(dashboard);
  if (!compact) return null;

  return {
    projectPath: compact.projectPath,
    scopePath: compact.scopePath,
    focusPath: compact.focusPath,
    snapshotKind: compact.snapshotKind,
    captureSource: compact.captureSource,
    capturedAt: compact.capturedAt,
    status: compact.status,
    health: compact.health,
    trend: compact.trend,
    performance: compact.performance,
    metrics: compact.metrics,
    sessions: compact.sessions ? {
      summary: compact.sessions.summary || null,
      clientSyncState: compact.sessions.clientSyncState || null,
      clientSyncReason: compact.sessions.clientSyncReason || null,
      clientSyncRecommendation: compact.sessions.clientSyncRecommendation || null,
      clientSyncSummary: compact.sessions.clientSyncSummary || null
    } : null,
    toolTelemetry: compact.toolTelemetry,
    metricDictionary: compact.metricDictionary || null,
    regressors: takeSample(compact.regressors || [], 5),
    improvements: takeSample(compact.improvements || [], 5),
    recommendations: takeSample(compact.recommendations || [], 5),
    watcherAlerts: takeSample(compact.watcherAlerts || [], 5),
    recentErrors: compact.recentErrors ? {
      total: compact.recentErrors.total,
      warnings: compact.recentErrors.warnings,
      errors: compact.recentErrors.errors,
      logs: takeSample(compact.recentErrors.logs || [], 3)
    } : null,
    history: compact.history,
    summary: compact.summary
  };
}

export function compactCompilerHealthPanelSummary(panel) {
  const compact = summarizeCompilerHealthPanel(panel);
  if (!compact) return null;

  return {
    projectPath: compact.projectPath,
    scopePath: compact.scopePath,
    focusPath: compact.focusPath,
    snapshotKind: compact.snapshotKind,
    captureSource: compact.captureSource,
    capturedAt: compact.capturedAt,
    status: compact.status,
    headline: compact.headline,
    now: compact.now,
    trend: compact.trend,
    performance: compact.performance,
    tools: compact.tools,
    metricDictionary: compact.metricDictionary || null,
    topRegressors: takeSample(compact.topRegressors || [], 3),
    topImprovements: takeSample(compact.topImprovements || [], 3),
    topRecommendations: takeSample(compact.topRecommendations || [], 3),
    nextAction: compact.nextAction,
    summary: compact.summary,
    oneLine: compact.oneLine
  };
}

export function compactWatcherSummary(watcher) {
  if (!watcher || typeof watcher !== 'object') return null;

  const originCounts = watcher.originCounts || watcher.changeOrigins || {};
  const surfaceCounts = watcher.surfaceCounts || {};

  return {
    isRunning: watcher.isRunning !== false,
    pendingChanges: normalizeCount(watcher.pendingChanges),
    trackedFiles: normalizeCount(watcher.trackedFiles),
    startupNoiseSuppressed: normalizeCount(watcher.startupNoiseSuppressed),
    totalChanges: normalizeCount(watcher.totalChanges),
    processedChanges: normalizeCount(watcher.processedChanges),
    failedChanges: normalizeCount(watcher.failedChanges),
    lastProcessedAt: watcher.lastProcessedAt || null,
    lastChangeAt: watcher.lastChangeAt || null,
    lastChangeOrigin: watcher.lastChangeOrigin || null,
    lastChangeSurface: watcher.lastChangeSurface || null,
    originCounts: {
      filesystem: normalizeCount(originCounts.filesystem),
      manual: normalizeCount(originCounts.manual),
      api: normalizeCount(originCounts.api),
      atomic: normalizeCount(originCounts.atomic),
      unknown: normalizeCount(originCounts.unknown)
    },
    surfaceCounts: {
      code: normalizeCount(surfaceCounts.code),
      manifest: normalizeCount(surfaceCounts.manifest),
      buildConfig: normalizeCount(surfaceCounts['build-config'] || surfaceCounts.buildConfig),
      dependencyMetadata: normalizeCount(surfaceCounts['dependency-metadata'] || surfaceCounts.dependencyMetadata),
      provenanceOnly: normalizeCount(surfaceCounts['provenance-only'] || surfaceCounts.provenanceOnly),
      ignored: normalizeCount(surfaceCounts.ignored),
      unknown: normalizeCount(surfaceCounts.unknown)
    }
  };
}

export function resolvePolicyCoverageSummary(status = {}) {
  const systemInventory = status.systemInventory || {};
  const inventorySummary = systemInventory.summary || {};
  const compilerExplainability = status.compilerExplainability || {};
  const policyCoverage = firstDefined(
    systemInventory.policyCoverage,
    inventorySummary.policyCoverage,
    compilerExplainability.policyCoverage
  );

  if (!policyCoverage) {
    return null;
  }

  return {
    state: firstDefined(systemInventory.policyCoverageState, inventorySummary.policyCoverageState, policyCoverage.coverageState, 'watching'),
    score: normalizeCount(firstDefined(systemInventory.policyCoverageScore, inventorySummary.policyCoverageScore, policyCoverage.coverageScore, 0)),
    drift: normalizeCount(firstDefined(systemInventory.policyCoverageDriftCount, inventorySummary.policyCoverageDriftCount, policyCoverage.policyDriftCount, 0)),
    expansion: firstDefined(systemInventory.policyCoveragePropagationState, inventorySummary.policyCoveragePropagationState, policyCoverage.propagationExpansionState, 'n/a'),
    coverageRatio: Number(firstDefined(systemInventory.policyCoverageRatio, inventorySummary.policyCoverageRatio, policyCoverage.coverageRatio, 0)) || 0,
    coveragePercent: toCoveragePercent(firstDefined(systemInventory.policyCoverageRatio, inventorySummary.policyCoverageRatio, policyCoverage.coverageRatio, 0)),
    nextAction: firstDefined(systemInventory.policyCoverage?.nextAction, inventorySummary.nextAction, policyCoverage.nextAction, 'n/a'),
    policyCoverage
  };
}

export function resolveControlPlaneContracts(status = {}) {
  const metricsSnapshot = status.metricsSnapshot || {};
  const healthSnapshot = status.healthSnapshot || {};
  const compilerExplainability = status.compilerExplainability || {};
  const systemInventory = firstDefined(
    status.systemInventory,
    healthSnapshot.systemInventory,
    metricsSnapshot.systemInventory
  );
  const canonicalPromotion = firstDefined(
    status.canonicalPromotion,
    healthSnapshot.canonicalPromotion,
    metricsSnapshot.canonicalPromotion
  );
  const policyCoverage = resolvePolicyCoverageSummary({
    ...status,
    systemInventory: systemInventory || status.systemInventory,
    compilerExplainability
  });
  const folderizationAutomation = firstDefined(
    compilerExplainability.folderization?.automation,
    healthSnapshot.compilerExplainability?.folderization?.automation,
    metricsSnapshot.compilerExplainability?.folderization?.automation
  );
  const propagation = firstDefined(
    metricsSnapshot.propagation,
    metricsSnapshot.current?.folderizationPropagation
  );

  return {
    systemInventory: systemInventory || null,
    canonicalPromotion: canonicalPromotion || null,
    policyCoverage,
    folderizationAutomation: folderizationAutomation || null,
    propagation
  };
}

export function resolveDashboardControlPlaneContracts(snapshot = null, compilerExplainability = null) {
  const normalizedSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const current = normalizedSnapshot.current || {};
  const folderizationPropagation = current.folderizationPropagation || null;
  const canonicalPromotion = current.canonicalPromotion || null;
  const policyCoverage = compilerExplainability?.policyCoverage || compilerExplainability?.systemInventory?.policyCoverage || null;
  const propagationExpansion = compilerExplainability?.driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')
    || (compilerExplainability?.driftAssessment?.primaryIssue?.key === 'propagation_expansion' ? compilerExplainability.driftAssessment.primaryIssue : null);

  return {
    folderizationPropagation,
    canonicalPromotion,
    policyCoverage,
    propagationExpansion
  };
}

function compactInventorySnapshot(snapshot = {}) {
  return {
    totalTools: snapshot.summary?.totalTools || 0,
    categories: snapshot.summary?.categories || []
  };
}

function compactInventoryReport(report = {}) {
  return {
    dominantCategory: report.dominantCategory || null,
    dominantSubgroup: report.dominantSubgroup || null,
    categoryConcentration: report.categoryConcentration || 0,
    concentration: report.subgroupConcentration || report.concentration || 0,
    subgroupConcentration: report.subgroupConcentration || 0,
    subgroupStats: takeSample(report.subgroupStats || [], 5),
    recommendations: takeSample(report.recommendations || [], 3)
  };
}

export function compactToolInventory(toolInventory) {
  if (!toolInventory || typeof toolInventory !== 'object') return null;

  const snapshot = toolInventory.snapshot || {};
  const report = toolInventory.report || {};

  return {
    ...compactInventorySnapshot(snapshot),
    ...compactInventoryReport(report)
  };
}

export function summarizeNodeVitals(nodeVitals) {
  if (!nodeVitals || typeof nodeVitals !== 'object') return null;
  return {
    platform: nodeVitals.platform,
    nodeVersion: nodeVitals.nodeVersion,
    memory: nodeVitals.memory ? {
      rss: nodeVitals.memory.rss,
      heapUsed: nodeVitals.memory.heapUsed,
      heapTotal: nodeVitals.memory.heapTotal
    } : null,
    cpu: nodeVitals.cpu || null
  };
}

export { takeSample };

export default {
  compactDatabaseHealth,
  compactRepositoryDiagnostics,
  compactCompilerHealthDashboardSummary,
  compactCompilerHealthPanelSummary,
  compactWatcherSummary,
  compactToolInventory,
  resolvePolicyCoverageSummary,
  resolveControlPlaneContracts,
  resolveDashboardControlPlaneContracts,
  summarizeNodeVitals,
  takeSample
};
