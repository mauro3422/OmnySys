/**
 * Shared compacting helpers for MCP status summaries.
 */

import { normalizeCount, summarizeSurfaceAuditForStatus } from '../../../shared/compiler/index.js';
import { compactWatcherSummary } from './status-watcher-summary.js';

export function takeSample(items = [], limit = 3) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit);
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

export function compactCompilerExplainabilitySummary(explainability) {
  if (!explainability || typeof explainability !== 'object') return null;

  return {
    policySummary: explainability.policySummary ? {
      total: explainability.policySummary.total,
      high: explainability.policySummary.high,
      medium: explainability.policySummary.medium,
      low: explainability.policySummary.low
    } : null,
    standardization: explainability.standardization ? {
      canonicalFamilies: explainability.standardization.canonicalFamilies?.length || 0,
      stableCanonicalFamilies: explainability.standardization.stableCanonicalFamilies?.length || 0,
      summary: explainability.standardization.summary || null
    } : null,
    compilerContractLayer: explainability.compilerContractLayer ? {
      summary: {
        healthy: explainability.compilerContractLayer.summary?.healthy,
        failedInvariantCount: explainability.compilerContractLayer.summary?.failedInvariantCount,
        canonicalWrapperFindings: explainability.compilerContractLayer.summary?.canonicalWrapperFindings,
        canonicalBypassFindings: explainability.compilerContractLayer.summary?.canonicalBypassFindings,
        parallelCanonicalSurfaceFindings: explainability.compilerContractLayer.summary?.parallelCanonicalSurfaceFindings,
        dataGatewayContractTrustworthy: explainability.compilerContractLayer.summary?.dataGatewayContractTrustworthy,
        dataGatewayContractState: explainability.compilerContractLayer.summary?.dataGatewayContractState,
        nextAction: explainability.compilerContractLayer.summary?.nextAction
      }
    } : null,
    persistedFileCoverage: explainability.persistedFileCoverage ? {
      total: explainability.persistedFileCoverage.total,
      healthy: explainability.persistedFileCoverage.healthy
    } : null,
    fileImportEvidenceCoverage: explainability.fileImportEvidenceCoverage ? {
      total: explainability.fileImportEvidenceCoverage.total,
      healthy: explainability.fileImportEvidenceCoverage.healthy
    } : null,
    systemMapPersistenceCoverage: explainability.systemMapPersistenceCoverage ? {
      total: explainability.systemMapPersistenceCoverage.total,
      healthy: explainability.systemMapPersistenceCoverage.healthy
    } : null,
    metadataSurfaceParity: explainability.metadataSurfaceParity ? {
      total: explainability.metadataSurfaceParity.total,
      healthy: explainability.metadataSurfaceParity.healthy
    } : null,
    metadataExtractionCoverage: explainability.metadataExtractionCoverage ? {
      totalTables: explainability.metadataExtractionCoverage.summary?.totalTables,
      totalRows: explainability.metadataExtractionCoverage.summary?.totalRows,
      totalFields: explainability.metadataExtractionCoverage.summary?.totalFields,
      coveredFields: explainability.metadataExtractionCoverage.summary?.coveredFields,
      coveragePct: explainability.metadataExtractionCoverage.summary?.coveragePct,
      fieldCoveragePct: explainability.metadataExtractionCoverage.summary?.fieldCoveragePct,
      healthy: explainability.metadataExtractionCoverage.healthy,
      trustworthy: explainability.metadataExtractionCoverage.trustworthy,
      nextAction: explainability.metadataExtractionCoverage.summary?.nextAction,
      primaryIssue: explainability.metadataExtractionCoverage.primaryIssue,
      topMissingFields: takeSample(explainability.metadataExtractionCoverage.topMissingFields, 3),
      topCoveredFields: takeSample(explainability.metadataExtractionCoverage.topCoveredFields, 3)
    } : null,
    surfaceAudit: explainability.surfaceAudit ? summarizeSurfaceAuditForStatus(explainability.surfaceAudit) : null,
    semanticCanonicality: explainability.semanticCanonicality ? {
      total: explainability.semanticCanonicality.total,
      healthy: explainability.semanticCanonicality.healthy
    } : null,
    semanticSurfaceGranularity: explainability.semanticSurfaceGranularity ? {
      total: explainability.semanticSurfaceGranularity.total,
      healthy: explainability.semanticSurfaceGranularity.healthy
    } : null,
    fileUniverseGranularity: explainability.fileUniverseGranularity ? {
      total: explainability.fileUniverseGranularity.total,
      healthy: explainability.fileUniverseGranularity.healthy
    } : null,
    analysisGeneration: explainability.analysisGeneration ? {
      generationId: explainability.analysisGeneration.generationId,
      status: explainability.analysisGeneration.status,
      healthy: explainability.analysisGeneration.healthy,
      recommendation: explainability.analysisGeneration.recommendation
    } : null,
    watcher: compactWatcherSummary(explainability.watcherStats),
    dataGatewayContract: explainability.dataGatewayContract ? {
      sourceOfTruth: explainability.dataGatewayContract.contract?.recommendedSourceOfTruth,
      generation: explainability.dataGatewayContract.generation ? {
        generationId: explainability.dataGatewayContract.generation.generationId,
        status: explainability.dataGatewayContract.generation.status,
        healthy: explainability.dataGatewayContract.generation.healthy,
        recommendation: explainability.dataGatewayContract.generation.recommendation
      } : null,
      total: explainability.dataGatewayContract.summary?.total,
      fresh: explainability.dataGatewayContract.summary?.fresh,
      stale: explainability.dataGatewayContract.summary?.stale,
      missing: explainability.dataGatewayContract.summary?.missing,
      blocked: explainability.dataGatewayContract.summary?.blocked,
      trustworthy: explainability.dataGatewayContract.summary?.trustworthy,
      nextAction: explainability.dataGatewayContract.summary?.nextAction,
      primaryIssue: explainability.dataGatewayContract.summary?.primaryIssue
    } : null,
    folderization: explainability.folderization ? {
      candidateReport: explainability.folderization.candidateReport ? {
        candidateCount: explainability.folderization.candidateReport.candidateCount,
        topCandidates: takeSample(explainability.folderization.candidateReport.topCandidates || [], 3)
      } : null,
      familyState: explainability.folderization.familyState ? {
        totalFamilies: explainability.folderization.familyState.totalFamilies,
        stateCounts: explainability.folderization.familyState.stateCounts,
        topFamilies: takeSample(explainability.folderization.familyState.topFamilies || [], 3)
      } : null,
      migrationPlans: explainability.folderization.migrationPlans ? {
        candidateCount: explainability.folderization.migrationPlans.candidateCount,
        focusDecision: explainability.folderization.migrationPlans.focusCandidate?.decision || null
      } : null,
      naming: explainability.folderization.naming ? {
        familyCount: explainability.folderization.naming.familyCount,
        renameTargetCount: explainability.folderization.naming.renameTargetCount,
        topFamilies: takeSample(explainability.folderization.naming.topFamilies || [], 3)
      } : null
    } : null,
    databaseHealth: compactDatabaseHealth(explainability.databaseHealth)
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
