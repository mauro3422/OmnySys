/**
 * Final status summary assembly.
 */

import { compactDatabaseHealth, compactCompilerExplainabilitySummary, summarizeNodeVitals, takeSample } from './status-summary-helpers.js';
import { compactWatcherSummary } from './status-watcher-summary.js';
import { compactToolInventory } from './status-tool-inventory.js';
import { summarizeSurfaceAuditForStatus } from '../../../shared/compiler/index.js';

export function summarizeStatus(status, recentErrors) {
  return {
    initialized: status.initialized,
    initializing: status.initializing,
    project: status.project,
    hotReloadTest: status.hotReloadTest,
    timestamp: status.timestamp,
    telemetryMode: status.telemetryMode,
    summary: {
      total: recentErrors?.summary?.total || 0,
      warnings: recentErrors?.summary?.warnings || 0,
      errors: recentErrors?.summary?.errors || 0
    },
    recentErrors,
    databaseHealth: compactDatabaseHealth(status.databaseHealth),
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
    watcher: compactWatcherSummary(status.watcher),
    telemetryProvenance: status.telemetryProvenance || null,
    compilerExplainability: compactCompilerExplainabilitySummary(status.compilerExplainability),
    toolInventory: compactToolInventory(status.toolInventory),
    surfaceAudit: summarizeSurfaceAuditForStatus(status.surfaceAudit || status.compilerExplainability?.surfaceAudit),
    signalConfidence: status.signalConfidence || null,
    warnings: takeSample(status.warnings || [], 3),
    criticalIssues: takeSample(status.criticalIssues || [], 3)
  };
}
