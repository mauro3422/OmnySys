/**
 * Canonical surface inventory builder.
 * Composes table, coverage, contract and semantic surfaces into one inventory.
 */

import { buildCanonicalTableSurfaces, buildRuntimeBoundarySurface } from './table-surfaces.js';
import { buildCoverageAndSupportSurfaces } from './coverage-surfaces.js';
import { buildContractAndSemanticSurfaces } from './contract-surfaces.js';
import { buildSurface, buildInvariant } from './models.js';

export function buildSurfaceInventory({
  persistedFileCoverage = null,
  fileUniverseGranularity = null,
  metadataSurfaceParity = null,
  metadataExtractionCoverage = null,
  semanticSurfaceGranularity = null,
  semanticCanonicality = null,
  dataGatewayContract = null,
  systemMapPersistenceCoverage = null,
  tableCounts = {}
} = {}) {
  return [
    ...buildCanonicalTableSurfaces(tableCounts, persistedFileCoverage, fileUniverseGranularity),
    ...buildContractAndSemanticSurfaces({ semanticCanonicality, semanticSurfaceGranularity, dataGatewayContract }),
    buildRuntimeBoundarySurface(),
    ...buildCoverageAndSupportSurfaces({
      metadataSurfaceParity,
      metadataExtractionCoverage,
      systemMapPersistenceCoverage,
      tableCounts
    })
  ];
}

export {
  buildSurface,
  buildInvariant
};
