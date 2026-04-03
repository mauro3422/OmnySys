/**
 * Canonical structured MCP status payload builder.
 */

import {
  compactDatabaseHealth,
  compactCompilerHealthDashboardSummary,
  compactCompilerHealthPanelSummary,
  compactRepositoryDiagnostics,
  compactWatcherSummary,
  compactToolInventory,
  summarizeNodeVitals,
  takeSample
} from './status-summary-helpers.js';
import { summarizeCompilerMetricsSnapshot as compactCompilerMetricsSnapshotSummary } from './snapshot.js';
import { summarizeCompilerExplainability as compactCompilerExplainabilitySummary } from './compiler-explainability-summary.js';
import { buildSystemTableSummary } from './status-system-table.js';
import { buildUpdateSurfaceSummary } from './update-surface-summary.js';
import { buildCachePolicySummary } from './cache-policy-summary.js';
import { summarizeSurfaceAuditForStatus } from './surface-audit/audit.js';
import { buildCompilerStatusSummaryEnvelope } from './status-summary.js';

export function buildStatusSummaryPayload(status, recentErrors) {
  const databaseHealth = compactDatabaseHealth(status.databaseHealth);
  const repository = compactRepositoryDiagnostics(status.repository);
  const watcher = compactWatcherSummary(status.watcher);
  const compilerExplainability = compactCompilerExplainabilitySummary(status.compilerExplainability);
  const metricsSnapshot = compactCompilerMetricsSnapshotSummary(status.metricsSnapshot);
  const healthSnapshot = compactCompilerHealthDashboardSummary(status.healthSnapshot);
  const healthPanel = compactCompilerHealthPanelSummary(status.healthPanel);
  const toolInventory = compactToolInventory(status.toolInventory);
  const systemInventory = status.systemInventory || status.healthSnapshot?.systemInventory || status.metricsSnapshot?.systemInventory || null;
  const canonicalPromotion = status.canonicalPromotion || status.healthSnapshot?.canonicalPromotion || status.metricsSnapshot?.canonicalPromotion || null;
  const updateSurface = buildUpdateSurfaceSummary(status);
  const cachePolicy = buildCachePolicySummary({
    recentErrors,
    databaseHealth: status.databaseHealth,
    metricsSnapshot: status.metricsSnapshot,
    toolInventory: status.toolInventory,
    watcher: status.watcher,
    mcpSessions: status.background?.mcpSessionSummary || status.mcpSessions || null
  });
  const systemTable = buildSystemTableSummary({
    ...status,
    cachePolicy
  });
  const propagation = metricsSnapshot?.propagation || metricsSnapshot?.current?.folderizationPropagation || null;

  return buildCompilerStatusSummaryEnvelope(status, recentErrors, {
    databaseHealth,
    repository,
    metadata: status.metadata ? {
      totalFiles: status.metadata.totalFiles,
      totalFunctions: status.metadata.totalFunctions,
      lastAnalyzed: status.metadata.lastAnalyzed,
      liveAtomCount: status.metadata.liveAtomCount,
      liveFileCount: status.metadata.liveFileCount,
      phase2PendingFiles: status.metadata.phase2PendingFiles,
      phase2CompletedFiles: status.metadata.phase2CompletedFiles,
      societiesCount: status.metadata.societiesCount
    } : null,
    cache: status.cache ? {
      atoms: status.cache.atoms,
      files: status.cache.files,
      relations: status.cache.relations,
      status: status.cache.status
    } : null,
    nodeVitals: summarizeNodeVitals(status.nodeVitals),
    sharedState: status.sharedState ? {
      activeSocietiesBadge: status.sharedState.activeSocietiesBadge,
      actorCount: status.sharedState.actorCount,
      totalLinks: status.sharedState.totalLinks,
      maxContention: status.sharedState.maxContention,
      hottestKey: status.sharedState.hottestKey,
      topContentionKeys: takeSample(status.sharedState.topContentionKeys, 3)
    } : null,
    background: status.background ? {
      phase2PendingFiles: status.background.phase2PendingFiles,
      phase2CompletedFiles: status.background.phase2CompletedFiles,
      societiesCount: status.background.societiesCount,
      graphCoverage: status.background.graphCoverage ? {
        filesTotal: status.background.graphCoverage.filesTotal,
        dependenciesTotal: status.background.graphCoverage.dependenciesTotal,
        coverageRatio: status.background.graphCoverage.coverageRatio,
        callGraphLinks: status.background.graphCoverage.callGraphLinks
      } : null,
      fileUniverseSummary: status.background.fileUniverseSummary ? {
        scannedFileTotal: status.background.fileUniverseSummary.scannedFileTotal,
        liveFileCount: status.background.fileUniverseSummary.liveFileCount,
        zeroAtomFileCount: status.background.fileUniverseSummary.zeroAtomFileCount,
        liveCoverageRatio: status.background.fileUniverseSummary.liveCoverageRatio
      } : null,
      conceptualDuplicates: status.background.conceptualDuplicates ? {
        actionableGroups: status.background.conceptualDuplicates.actionableGroups,
        rawGroups: status.background.conceptualDuplicates.rawGroups,
        actionableRatio: status.background.conceptualDuplicates.actionableRatio
      } : null,
      issueSummary: status.background.issueSummary || null,
      mcpSessionSummary: status.background.mcpSessionSummary || null
    } : null,
    mcpSessions: status.mcpSessions || null,
    compilerReadiness: status.compilerReadiness ? {
      ready: status.compilerReadiness.ready,
      health: status.compilerReadiness.health,
      warnings: takeSample(status.compilerReadiness.warnings || [], 3)
    } : null,
    runtime: status.hotReload ? {
      runtimeRestartMode: status.hotReload.runtimeRestartMode,
      runtimeCodeFresh: status.hotReload.runtimeCodeFresh,
      restartRequired: status.hotReload.restartRequired
    } : null,
    watcher,
    telemetryProvenance: status.telemetryProvenance || null,
    compilerExplainability,
    metricsSnapshot,
    propagation,
    healthSnapshot,
    healthPanel,
    systemTable,
    systemInventory,
    canonicalPromotion,
    cachePolicy,
    toolInventory,
    updateSurface,
    surfaceAudit: summarizeSurfaceAuditForStatus(status.surfaceAudit || status.compilerExplainability?.surfaceAudit),
    signalConfidence: status.signalConfidence || null,
    warnings: takeSample(status.warnings || [], 3),
    criticalIssues: takeSample(status.criticalIssues || [], 3)
  });
}

export default {
  buildStatusSummaryPayload
};
