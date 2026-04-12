import { summarizeSemanticCanonicality } from './semantic-surface-granularity.js';
import { buildAnalysisGenerationSnapshot } from './counts-generation.js';
import { buildCompilerDriftAssessment } from './compiler-drift-assessment.js';
import { buildCompilerStandardizationReport } from './standardization-report/index.js';
import { buildCompilerContractLayer } from './compiler-contract-layer/layer.js';
import { buildSurfaceAudit } from './surface-audit/audit.js';
import { buildResolvedCanonicalAdoptions } from './compiler-diagnostics-snapshot-contracts-adoptions.js';
import { buildCompilerControlPlaneFoundations } from './control-plane-foundations.js';
import { validateMetricCoherence } from './metric-coherence-validator.js';

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
  const analysisGeneration = buildAnalysisGenerationSnapshot({
    projectPath,
    source: 'compiler-diagnostics-snapshot',
    phase: 'status',
    totalFiles: persistedFileCoverage?.scannedFileTotal || 0,
    atomCount: dbSurfaces.databaseHealth?.metrics?.activeAtoms || 0,
    relationCount: dbSurfaces.databaseHealth?.metrics?.activeCallRelations || 0,
    semanticConnectionCount: dbSurfaces.databaseHealth?.metrics?.activeSemanticConnections || 0
  });
  const {
    analysisGeneration: foundationsAnalysisGeneration,
    databaseHealth: foundationsDatabaseHealth,
    fileUniverseGranularity,
    dataGatewayContract,
    liveRowSync
  } = buildCompilerControlPlaneFoundations({
    persistedFileCoverage,
    dbSurfaces,
    db,
    analysisGeneration
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
    liveRowSync,
    systemMapPersistenceCoverage: dbSurfaces.systemMapPersistenceCoverage,
    semanticSurfaceGranularity: dbSurfaces.semanticSurfaceGranularity,
    fileUniverseGranularity,
    metricCoherence: db ? validateMetricCoherence({
      compilerExplainability: {
        databaseHealth: dbSurfaces.databaseHealth,
        fileUniverseGranularity
      },
      repo: { db }
    }) : null,
    compilerExplainability: {
      databaseHealth: dbSurfaces.databaseHealth,
      fileUniverseGranularity
    },
    repo: db ? { db } : null
  });

  return {
    persistedFileCoverage,
    semanticCanonicality,
    fileUniverseGranularity,
    analysisGeneration,
    dataGatewayContract,
    controlPlaneFoundations: {
      analysisGeneration: foundationsAnalysisGeneration,
      databaseHealth: foundationsDatabaseHealth,
      fileUniverseGranularity,
      dataGatewayContract,
      liveRowSync
    },
    resolvedCanonicalAdoptions,
    standardizationReport,
    compilerContractLayer,
    surfaceAudit,
    driftAssessment
  };
}
