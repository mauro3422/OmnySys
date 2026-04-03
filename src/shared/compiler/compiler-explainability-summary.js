/**
 * Canonical compiler explainability summary.
 */

import { summarizeCompilerDriftAssessment } from './compiler-drift-assessment.js';
import { summarizeMetadataExtractionCoverage } from './metadata-extraction-coverage/coverage.js';
import { summarizeDataGatewayContract } from './contract.js';
import { summarizeSurfaceAuditForStatus } from './surface-audit/summary.js';

function takeSample(items = [], limit = 3) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit);
}

function compactCountPair(summary = null) {
  if (!summary) return null;
  return {
    total: summary.total,
    healthy: summary.healthy
  };
}

function compactPolicySummary(policySummary = null) {
  if (!policySummary) return null;
  return {
    total: policySummary.total,
    high: policySummary.high,
    medium: policySummary.medium,
    low: policySummary.low
  };
}

function compactStandardization(standardization = null) {
  if (!standardization) return null;
  return {
    canonicalFamilies: standardization.canonicalFamilies?.length || 0,
    stableCanonicalFamilies: standardization.stableCanonicalFamilies?.length || 0,
    summary: standardization.summary || null
  };
}

function compactCompilerContractLayer(compilerContractLayer = null) {
  if (!compilerContractLayer) return null;
  return {
    summary: {
      healthy: compilerContractLayer.summary?.healthy,
      failedInvariantCount: compilerContractLayer.summary?.failedInvariantCount,
      canonicalWrapperFindings: compilerContractLayer.summary?.canonicalWrapperFindings,
      canonicalBypassFindings: compilerContractLayer.summary?.canonicalBypassFindings,
      parallelCanonicalSurfaceFindings: compilerContractLayer.summary?.parallelCanonicalSurfaceFindings,
      dataGatewayContractTrustworthy: compilerContractLayer.summary?.dataGatewayContractTrustworthy,
      dataGatewayContractState: compilerContractLayer.summary?.dataGatewayContractState,
      nextAction: compilerContractLayer.summary?.nextAction
    }
  };
}

function compactAnalysisGeneration(analysisGeneration = null) {
  if (!analysisGeneration) return null;
  return {
    generationId: analysisGeneration.generationId,
    status: analysisGeneration.status,
    healthy: analysisGeneration.healthy,
    recommendation: analysisGeneration.recommendation
  };
}

function compactWatcherSummary(watcher = null) {
  if (!watcher) return null;
  return {
    total: watcher.total,
    active: watcher.active,
    stale: watcher.stale,
    expired: watcher.expired
  };
}

function compactCandidateReport(candidateReport = null) {
  if (!candidateReport) return null;
  return {
    candidateCount: candidateReport.candidateCount,
    topCandidates: takeSample(candidateReport.topCandidates || [], 3)
  };
}

function compactFamilyState(familyState = null) {
  if (!familyState) return null;
  return {
    totalFamilies: familyState.totalFamilies,
    stateCounts: familyState.stateCounts,
    topFamilies: takeSample(familyState.topFamilies || [], 3)
  };
}

function compactMigrationPlans(migrationPlans = null) {
  if (!migrationPlans) return null;
  return {
    candidateCount: migrationPlans.candidateCount,
    focusDecision: migrationPlans.focusCandidate?.decision || null
  };
}

function compactNaming(naming = null) {
  if (!naming) return null;
  return {
    familyCount: naming.familyCount,
    renameTargetCount: naming.renameTargetCount,
    topFamilies: takeSample(naming.topFamilies || [], 3)
  };
}

function compactNamingPatterns(namingPatterns = null) {
  if (!namingPatterns) return null;
  return {
    totalFamilies: namingPatterns.totalFamilies,
    totalTargets: namingPatterns.totalTargets,
    patternCounts: namingPatterns.patternCounts,
    topFamilyPatterns: takeSample(namingPatterns.topFamilyPatterns || [], 3),
    topRecommendedStems: takeSample(namingPatterns.topRecommendedStems || [], 5)
  };
}

function compactCreationGuidance(creationGuidance = null) {
  if (!creationGuidance) return null;
  return {
    mode: creationGuidance.mode,
    scopePath: creationGuidance.scopePath || null,
    focusPath: creationGuidance.focusPath || null,
    matchedBy: creationGuidance.matchedBy || 'global',
    familyDomain: creationGuidance.familyDomain || null,
    barrelPolicy: creationGuidance.barrelPolicy || null,
    helperPolicy: creationGuidance.helperPolicy || null,
    collisionPolicy: creationGuidance.collisionPolicy || null,
    selectionReason: creationGuidance.selectionReason || null,
    preferredFolder: creationGuidance.preferredFolder,
    preferredFamilyRoot: creationGuidance.preferredFamilyRoot,
    preferredDirectory: creationGuidance.preferredDirectory,
    preferredRoleStems: takeSample(creationGuidance.preferredRoleStems || [], 5),
    familyExamples: takeSample(creationGuidance.familyExamples || [], 3),
    guidance: creationGuidance.guidance
  };
}

function compactFolderization(folderization = null) {
  if (!folderization) return null;
  return {
    candidateReport: compactCandidateReport(folderization.candidateReport),
    familyState: compactFamilyState(folderization.familyState),
    migrationPlans: compactMigrationPlans(folderization.migrationPlans),
    naming: compactNaming(folderization.naming),
    namingPatterns: compactNamingPatterns(folderization.namingPatterns),
    creationGuidance: compactCreationGuidance(folderization.creationGuidance),
    namingDebt: folderization.namingDebt ? {
      familyCount: folderization.namingDebt.familyCount,
      renameTargetCount: folderization.namingDebt.renameTargetCount,
      renameTargetDensity: folderization.namingDebt.renameTargetDensity
    } : null,
    summary: folderization.summary || null
  };
}

export function summarizeCompilerExplainability(explainability) {
  if (!explainability || typeof explainability !== 'object') return null;
  return {
    policySummary: compactPolicySummary(explainability.policySummary),
    standardization: compactStandardization(explainability.standardization),
    compilerContractLayer: compactCompilerContractLayer(explainability.compilerContractLayer),
    persistedFileCoverage: compactCountPair(explainability.persistedFileCoverage),
    fileImportEvidenceCoverage: compactCountPair(explainability.fileImportEvidenceCoverage),
    systemMapPersistenceCoverage: compactCountPair(explainability.systemMapPersistenceCoverage),
    metadataSurfaceParity: compactCountPair(explainability.metadataSurfaceParity),
    metadataExtractionCoverage: summarizeMetadataExtractionCoverage(explainability.metadataExtractionCoverage),
    surfaceAudit: explainability.surfaceAudit ? summarizeSurfaceAuditForStatus(explainability.surfaceAudit) : null,
    semanticCanonicality: compactCountPair(explainability.semanticCanonicality),
    semanticSurfaceGranularity: compactCountPair(explainability.semanticSurfaceGranularity),
    driftAssessment: explainability.driftAssessment
      ? summarizeCompilerDriftAssessment(explainability.driftAssessment)
      : null,
    fileUniverseGranularity: compactCountPair(explainability.fileUniverseGranularity),
    analysisGeneration: compactAnalysisGeneration(explainability.analysisGeneration),
    watcher: compactWatcherSummary(explainability.watcher),
    dataGatewayContract: summarizeDataGatewayContract(explainability.dataGatewayContract),
    folderization: compactFolderization(explainability.folderization),
    databaseHealth: explainability.databaseHealth || null
  };
}

export default {
  summarizeCompilerExplainability
};
