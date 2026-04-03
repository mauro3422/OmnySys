import { summarizeCompilerDriftAssessment } from './compiler-drift-assessment.js';
import { summarizeMetadataExtractionCoverage } from './metadata-extraction-coverage/coverage.js';
import { summarizeDataGatewayContract } from './contract.js';
import { summarizeSurfaceAuditForStatus } from './surface-audit/summary.js';
import { takeSample } from './sample-helpers.js';

export function compactCountPair(summary = null) {
  if (!summary) return null;
  return {
    total: summary.total,
    healthy: summary.healthy
  };
}

export function compactAnalysisGeneration(analysisGeneration = null) {
  if (!analysisGeneration) return null;
  return {
    generationId: analysisGeneration.generationId,
    status: analysisGeneration.status,
    healthy: analysisGeneration.healthy,
    recommendation: analysisGeneration.recommendation
  };
}

export function compactExplainabilityWatcherSummary(watcher = null) {
  if (!watcher) return null;
  return {
    total: watcher.total,
    active: watcher.active,
    stale: watcher.stale,
    expired: watcher.expired
  };
}

export function compactCandidateReport(candidateReport = null) {
  if (!candidateReport) return null;
  return {
    candidateCount: candidateReport.candidateCount,
    topCandidates: takeSample(candidateReport.topCandidates || [], 3)
  };
}

export function compactFamilyState(familyState = null) {
  if (!familyState) return null;
  return {
    totalFamilies: familyState.totalFamilies,
    stateCounts: familyState.stateCounts,
    topFamilies: takeSample(familyState.topFamilies || [], 3)
  };
}

export function compactMigrationPlans(migrationPlans = null) {
  if (!migrationPlans) return null;
  return {
    candidateCount: migrationPlans.candidateCount,
    focusDecision: migrationPlans.focusCandidate?.decision || null
  };
}

export function compactNaming(naming = null) {
  if (!naming) return null;
  return {
    familyCount: naming.familyCount,
    renameTargetCount: naming.renameTargetCount,
    topFamilies: takeSample(naming.topFamilies || [], 3)
  };
}

export function compactNamingPatterns(namingPatterns = null) {
  if (!namingPatterns) return null;
  return {
    totalFamilies: namingPatterns.totalFamilies,
    totalTargets: namingPatterns.totalTargets,
    patternCounts: namingPatterns.patternCounts,
    topFamilyPatterns: takeSample(namingPatterns.topFamilyPatterns || [], 3),
    topRecommendedStems: takeSample(namingPatterns.topRecommendedStems || [], 5)
  };
}

export function compactCreationGuidance(creationGuidance = null) {
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

export function compactFolderization(folderization = null) {
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

export function compactSurfaceAudit(surfaceAudit = null) {
  return surfaceAudit ? summarizeSurfaceAuditForStatus(surfaceAudit) : null;
}

export function compactMetadataExtractionCoverage(metadataExtractionCoverage = null) {
  return summarizeMetadataExtractionCoverage(metadataExtractionCoverage);
}

export function compactDriftAssessment(driftAssessment = null) {
  return driftAssessment ? summarizeCompilerDriftAssessment(driftAssessment) : null;
}

export function compactDataGatewayContract(dataGatewayContract = null) {
  return summarizeDataGatewayContract(dataGatewayContract);
}
