/**
 * @fileoverview Canonical foundations for compiler control-plane contracts.
 *
 * Keeps the runtime-facing contract inputs together so status, health,
 * inventory and watcher surfaces can consume the same foundations without
 * recomposing DB trust inputs inline.
 *
 * @module shared/compiler/control-plane-foundations
 */

import { buildDataGatewayContract } from './contract.js';
import { getFileUniverseGranularity } from './file-universe-granularity.js';
import { getLiveFileTotal } from './live-row-utils.js';

export function buildCompilerControlPlaneFoundations({
  persistedFileCoverage = null,
  dbSurfaces = {},
  db = null,
  analysisGeneration = null
} = {}) {
  const fileUniverseGranularity = getFileUniverseGranularity({
    scannedFileTotal: persistedFileCoverage?.scannedFileTotal || 0,
    manifestFileTotal: persistedFileCoverage?.manifestFileTotal || 0,
    liveFileCount: db ? getLiveFileTotal(db) : (persistedFileCoverage?.liveIndexedFiles || 0)
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

  return {
    analysisGeneration,
    databaseHealth: dbSurfaces.databaseHealth || null,
    fileUniverseGranularity,
    dataGatewayContract,
    liveRowSync: dbSurfaces.databaseHealth?.metrics?.liveRowSync || null
  };
}

export default {
  buildCompilerControlPlaneFoundations
};
