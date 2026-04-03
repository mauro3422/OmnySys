/**
 * Canonical compiler explainability summary.
 */

import {
  compactAnalysisGeneration,
  compactCountPair,
  compactDataGatewayContract,
  compactDriftAssessment,
  compactFolderization,
  compactMetadataExtractionCoverage,
  compactSurfaceAudit,
  compactExplainabilityWatcherSummary
} from './compiler-explainability-summary-helpers.js';
import { compactCompilerContractLayer } from './compiler-explainability-contract-layer.js';
import { compactPolicySummary } from './compiler-explainability-policy.js';
import { compactStandardization } from './compiler-explainability-standardization.js';

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
    metadataExtractionCoverage: compactMetadataExtractionCoverage(explainability.metadataExtractionCoverage),
    surfaceAudit: explainability.surfaceAudit ? compactSurfaceAudit(explainability.surfaceAudit) : null,
    semanticCanonicality: compactCountPair(explainability.semanticCanonicality),
    semanticSurfaceGranularity: compactCountPair(explainability.semanticSurfaceGranularity),
    driftAssessment: compactDriftAssessment(explainability.driftAssessment),
    fileUniverseGranularity: compactCountPair(explainability.fileUniverseGranularity),
    analysisGeneration: compactAnalysisGeneration(explainability.analysisGeneration),
    watcher: compactExplainabilityWatcherSummary(explainability.watcher),
    dataGatewayContract: compactDataGatewayContract(explainability.dataGatewayContract),
    folderization: compactFolderization(explainability.folderization),
    canonicalPromotion: explainability.canonicalPromotion ? {
      promotionState: explainability.canonicalPromotion.summary?.promotionState || explainability.canonicalPromotion.promotionState || null,
      inventoryState: explainability.canonicalPromotion.summary?.inventoryState || explainability.canonicalPromotion.inventoryState || null,
      folderizationState: explainability.canonicalPromotion.summary?.folderizationState || explainability.canonicalPromotion.folderizationState || null,
      folderizationDecision: explainability.canonicalPromotion.summary?.folderizationDecision || explainability.canonicalPromotion.folderizationDecision || null,
      candidateCount: explainability.canonicalPromotion.summary?.candidateCount || explainability.canonicalPromotion.candidateCount || 0,
      folderizedFamilyCount: explainability.canonicalPromotion.summary?.folderizedFamilyCount || explainability.canonicalPromotion.folderizedFamilyCount || 0,
      emergentCandidateCount: explainability.canonicalPromotion.summary?.emergentCandidateCount || explainability.canonicalPromotion.emergentCandidateCount || 0,
      canonicalCandidateCount: explainability.canonicalPromotion.summary?.canonicalCandidateCount || explainability.canonicalPromotion.canonicalCandidateCount || 0,
      nextAction: explainability.canonicalPromotion.summary?.nextAction || explainability.canonicalPromotion.nextAction || null,
      summaryText: explainability.canonicalPromotion.summary?.summaryText || explainability.canonicalPromotion.summaryText || null,
      topPromotionTargets: Array.isArray(explainability.canonicalPromotion.topPromotionTargets)
        ? explainability.canonicalPromotion.topPromotionTargets.slice(0, 5)
        : []
    } : null,
    databaseHealth: explainability.databaseHealth || null
  };
}

export default {
  summarizeCompilerExplainability
};
