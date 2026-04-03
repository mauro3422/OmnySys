/**
 * Canonical compiler explainability summary.
 */

import {
  compactAnalysisGeneration,
  compactCompilerContractLayer,
  compactCountPair,
  compactDataGatewayContract,
  compactDriftAssessment,
  compactFolderization,
  compactMetadataExtractionCoverage,
  compactPolicySummary,
  compactStandardization,
  compactSurfaceAudit,
  compactWatcherSummary
} from './compiler-explainability-summary-helpers.js';

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
    watcher: compactWatcherSummary(explainability.watcher),
    dataGatewayContract: compactDataGatewayContract(explainability.dataGatewayContract),
    folderization: compactFolderization(explainability.folderization),
    databaseHealth: explainability.databaseHealth || null
  };
}

export default {
  summarizeCompilerExplainability
};
