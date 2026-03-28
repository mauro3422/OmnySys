import { summarizeSemanticCanonicality } from './semantic-surface-granularity.js';
import { getFileUniverseGranularity } from './file-universe-granularity.js';
import { buildAnalysisGenerationSnapshot } from './analysis-generation.js';
import { buildCompilerDriftAssessment } from './compiler-drift-assessment.js';
import { buildDataGatewayContract } from './data-gateway-contract.js';
import { buildCompilerStandardizationReport } from './standardization-report.js';
import { buildCompilerContractLayer } from './compiler-contract-layer.js';
import { buildSurfaceAudit } from './surface-audit.js';
import { getLiveFileTotal } from './live-row-utils.js';
import { buildResolvedCanonicalAdoptions } from './compiler-diagnostics-snapshot-contracts-adoptions.js';

export function buildCompilerDiagnosticsSnapshotContracts({
  projectPath,
  persistedFileCoverage,
  canonicalAdoptionEvidence,
  dbSurfaces,
  db,
  policySummary,
  watcherAlerts,
  sharedState,
  compilerRemediation,
  canonicalAdoptions,
  tableCounts
}) {
  const semanticCanonicality = summarizeSemanticCanonicality(dbSurfaces.semanticSurfaceGranularity);
  const fileUniverseGranularity = getFileUniverseGranularity({
    scannedFileTotal: persistedFileCoverage?.scannedFileTotal || 0,
    manifestFileTotal: persistedFileCoverage?.manifestFileTotal || 0,
    liveFileCount: db ? getLiveFileTotal(db) : (persistedFileCoverage?.liveIndexedFiles || 0)
  });
  const analysisGeneration = buildAnalysisGenerationSnapshot({
    projectPath,
    source: 'compiler-diagnostics-snapshot',
    phase: 'status',
    totalFiles: persistedFileCoverage?.scannedFileTotal || 0,
    atomCount: dbSurfaces.databaseHealth?.metrics?.activeAtoms || 0,
    relationCount: dbSurfaces.databaseHealth?.metrics?.activeCallRelations || 0,
    semanticConnectionCount: dbSurfaces.databaseHealth?.metrics?.activeSemanticConnections || 0
  });
  const dataGatewayContract = buildDataGatewayContract({
    analysisGeneration,
    persistedFileCoverage,
    fileImportEvidenceCoverage: dbSurfaces.fileImportEvidenceCoverage,
    systemMapPersistenceCoverage: dbSurfaces.systemMapPersistenceCoverage,
    metadataSurfaceParity: dbSurfaces.metadataSurfaceParity,
    metadataExtractionCoverage: dbSurfaces.metadataExtractionCoverage,
    semanticSurfaceGranularity: dbSurfaces.semanticSurfaceGranularity,
    fileUniverseGranularity,
    databaseHealth: dbSurfaces.databaseHealth
  });
  const resolvedCanonicalAdoptions = buildResolvedCanonicalAdoptions({
    canonicalAdoptionEvidence,
    persistedFileCoverage,
    canonicalAdoptions
  });

  const standardizationReport = buildCompilerStandardizationReport({
    policySummary,
    watcherAlerts,
    sharedState,
    compilerRemediation,
    persistedFileCoverage,
    fileImportEvidenceCoverage: dbSurfaces.fileImportEvidenceCoverage,
    systemMapPersistenceCoverage: dbSurfaces.systemMapPersistenceCoverage,
    metadataSurfaceParity: dbSurfaces.metadataSurfaceParity,
    metadataExtractionCoverage: dbSurfaces.metadataExtractionCoverage,
    semanticSurfaceGranularity: dbSurfaces.semanticSurfaceGranularity,
    semanticCanonicality,
    contractTaxonomy: dbSurfaces.contractTaxonomy,
    fileUniverseGranularity,
    dataGatewayContract,
    canonicalAdoptions: resolvedCanonicalAdoptions
  });

  const compilerContractLayer = buildCompilerContractLayer({
    persistedFileCoverage,
    fileUniverseGranularity,
    metadataSurfaceParity: dbSurfaces.metadataSurfaceParity,
    metadataExtractionCoverage: dbSurfaces.metadataExtractionCoverage,
    semanticSurfaceGranularity: dbSurfaces.semanticSurfaceGranularity,
    semanticCanonicality,
    contractTaxonomy: dbSurfaces.contractTaxonomy,
    systemMapPersistenceCoverage: dbSurfaces.systemMapPersistenceCoverage,
    dataGatewayContract,
    standardization: standardizationReport,
    policySummary,
    tableCounts
  });
  const surfaceAudit = buildSurfaceAudit({
    analysisGeneration,
    dataGatewayContract,
    databaseHealth: dbSurfaces.databaseHealth,
    fileImportEvidenceCoverage: dbSurfaces.fileImportEvidenceCoverage,
    systemMapPersistenceCoverage: dbSurfaces.systemMapPersistenceCoverage,
    metadataSurfaceParity: dbSurfaces.metadataSurfaceParity,
    metadataExtractionCoverage: dbSurfaces.metadataExtractionCoverage,
    semanticSurfaceGranularity: dbSurfaces.semanticSurfaceGranularity,
    fileUniverseGranularity
  });
  const driftAssessment = buildCompilerDriftAssessment({
    analysisGeneration,
    policySummary,
    metadataSurfaceParity: dbSurfaces.metadataSurfaceParity,
    metadataExtractionCoverage: dbSurfaces.metadataExtractionCoverage,
    dataGatewayContract,
    databaseHealth: dbSurfaces.databaseHealth,
    liveRowSync: dbSurfaces.databaseHealth?.metrics?.liveRowSync || null,
    systemMapPersistenceCoverage: dbSurfaces.systemMapPersistenceCoverage,
    semanticSurfaceGranularity: dbSurfaces.semanticSurfaceGranularity,
    fileUniverseGranularity
  });

  return {
    persistedFileCoverage,
    semanticCanonicality,
    fileUniverseGranularity,
    analysisGeneration,
    dataGatewayContract,
    resolvedCanonicalAdoptions,
    standardizationReport,
    compilerContractLayer,
    surfaceAudit,
    driftAssessment
  };
}
