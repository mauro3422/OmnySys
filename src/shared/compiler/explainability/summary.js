/**
 * Canonical compiler explainability summary.
 */

import {
  compactAnalysisGeneration,
  compactCountPair,
  compactControlPlane,
  compactDataGatewayContract,
  compactDriftAssessment,
  compactFolderization,
  compactMetadataExtractionCoverage,
  compactSurfaceAudit,
  compactCanonicalPromotion,
  compactExplainabilityWatcherSummary,
  compactPolicyCoverage
} from './index.js';
import { compactCompilerContractLayer } from '../compiler-explainability-contract-layer.js';
import { compactPolicySummary } from './policy.js';
import { compactStandardization } from '../compiler-explainability-standardization.js';
import { summarizePropagationLedger } from '../propagation-ledger.js';

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
    canonicalPromotion: compactCanonicalPromotion(explainability.canonicalPromotion),
    policyCoverage: compactPolicyCoverage(explainability.policyCoverage),
    controlPlane: compactControlPlane(explainability.controlPlane),
    propagationLedger: summarizePropagationLedger(explainability.propagationLedger),
    databaseHealth: explainability.databaseHealth || null
  };
}

export default {
  summarizeCompilerExplainability
};
