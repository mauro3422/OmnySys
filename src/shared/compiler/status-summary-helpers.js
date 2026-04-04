/**
 * Canonical compact helpers for MCP status summaries.
 */

import { normalizeCount } from './contract-helpers.js';
import {
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel
} from './dashboard.js';
import {
  compactToolInventory,
  resolveControlPlaneContracts,
  resolveDashboardControlPlaneContracts,
  resolvePolicyCoverageSummary,
  summarizeNodeVitals
} from './status-control-plane-contracts.js';
import { takeSample } from './sample-helpers.js';

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

export {
  compactToolInventory,
  resolvePolicyCoverageSummary,
  resolveControlPlaneContracts,
  resolveDashboardControlPlaneContracts,
  summarizeNodeVitals
};

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
