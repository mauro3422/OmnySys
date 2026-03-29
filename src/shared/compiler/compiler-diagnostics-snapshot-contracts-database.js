import { getFileImportEvidenceCoverage } from './file-import-evidence.js';
import { getSystemMapPersistenceCoverage } from './system-map-persistence.js';
import { getMetadataSurfaceParity } from './metadata-surface-parity.js';
import { getMetadataExtractionCoverage } from './metadata-extraction-coverage/coverage.js';
import { getSemanticSurfaceGranularity } from './semantic-surface-granularity.js';
import { summarizeContractTaxonomy } from './contract-taxonomy/index.js';
import { getDatabaseHealthSummary } from './database-health.js';
import { getPhase2PendingFiles } from './compiler-runtime-metrics/index.js';

export function getCompilerDiagnosticsDatabaseSurfaces(db) {
  const phase2PendingFiles = db ? getPhase2PendingFiles(db) : 0;

  return {
    phase2PendingFiles,
    fileImportEvidenceCoverage: db ? getFileImportEvidenceCoverage(db) : null,
    systemMapPersistenceCoverage: db ? getSystemMapPersistenceCoverage(db) : null,
    metadataSurfaceParity: db ? getMetadataSurfaceParity(db) : null,
    metadataExtractionCoverage: db ? getMetadataExtractionCoverage(db) : null,
    semanticSurfaceGranularity: db ? getSemanticSurfaceGranularity(db) : null,
    contractTaxonomy: db ? summarizeContractTaxonomy(db) : null,
    databaseHealth: db ? getDatabaseHealthSummary(db) : null
  };
}
