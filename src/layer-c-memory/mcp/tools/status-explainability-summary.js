/**
 * Compact compiler explainability summary for MCP status.
 */

import {
  summarizeCompilerDriftAssessment,
  summarizeSurfaceAuditForStatus
} from '../../../shared/compiler/index.js';

function takeSample(items = [], limit = 3) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit);
}

export function compactCompilerExplainabilitySummary(explainability) {
  if (!explainability || typeof explainability !== 'object') return null;
  const driftAssessment = explainability.driftAssessment
    ? summarizeCompilerDriftAssessment(explainability.driftAssessment)
    : null;

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
    driftAssessment,
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
    watcher: explainability.watcher ? {
      total: explainability.watcher.total,
      active: explainability.watcher.active,
      stale: explainability.watcher.stale,
      expired: explainability.watcher.expired
    } : null,
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
      } : null,
      namingPatterns: explainability.folderization.namingPatterns ? {
        totalFamilies: explainability.folderization.namingPatterns.totalFamilies,
        totalTargets: explainability.folderization.namingPatterns.totalTargets,
        patternCounts: explainability.folderization.namingPatterns.patternCounts,
        topFamilyPatterns: takeSample(explainability.folderization.namingPatterns.topFamilyPatterns || [], 3),
        topRecommendedStems: takeSample(explainability.folderization.namingPatterns.topRecommendedStems || [], 5)
      } : null,
      creationGuidance: explainability.folderization.creationGuidance ? {
        mode: explainability.folderization.creationGuidance.mode,
        scopePath: explainability.folderization.creationGuidance.scopePath || null,
        focusPath: explainability.folderization.creationGuidance.focusPath || null,
        matchedBy: explainability.folderization.creationGuidance.matchedBy || 'global',
        familyDomain: explainability.folderization.creationGuidance.familyDomain || null,
        barrelPolicy: explainability.folderization.creationGuidance.barrelPolicy || null,
        helperPolicy: explainability.folderization.creationGuidance.helperPolicy || null,
        collisionPolicy: explainability.folderization.creationGuidance.collisionPolicy || null,
        selectionReason: explainability.folderization.creationGuidance.selectionReason || null,
        preferredFolder: explainability.folderization.creationGuidance.preferredFolder,
        preferredFamilyRoot: explainability.folderization.creationGuidance.preferredFamilyRoot,
        preferredDirectory: explainability.folderization.creationGuidance.preferredDirectory,
        preferredRoleStems: takeSample(explainability.folderization.creationGuidance.preferredRoleStems || [], 5),
        familyExamples: takeSample(explainability.folderization.creationGuidance.familyExamples || [], 3),
        guidance: explainability.folderization.creationGuidance.guidance
      } : null,
      namingDebt: explainability.folderization.namingDebt ? {
        familyCount: explainability.folderization.namingDebt.familyCount,
        renameTargetCount: explainability.folderization.namingDebt.renameTargetCount,
        renameTargetDensity: explainability.folderization.namingDebt.renameTargetDensity
      } : null,
      summary: explainability.folderization.summary || null
    } : null,
    databaseHealth: explainability.databaseHealth || null
  };
}

export default {
  compactCompilerExplainabilitySummary
};
