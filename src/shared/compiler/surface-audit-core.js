/**
 * @fileoverview Core surface audit builder for compiler/runtime status surfaces.
 *
 * @module shared/compiler/surface-audit-core
 */

import { summarizeAnalysisGeneration } from './analysis-generation.js';
import { summarizeDataGatewayContract } from './data-gateway-contract.js';
import { summarizeMetadataExtractionCoverage } from './metadata-extraction-coverage.js';
import {
  compactSurfaceEntry,
  summarizeSurfaceMetrics
} from './surface-audit-helpers.js';

export function buildSurfaceAudit({
  analysisGeneration = null,
  dataGatewayContract = null,
  databaseHealth = null,
  fileImportEvidenceCoverage = null,
  systemMapPersistenceCoverage = null,
  metadataSurfaceParity = null,
  metadataExtractionCoverage = null,
  semanticSurfaceGranularity = null,
  fileUniverseGranularity = null
} = {}) {
  const generation = summarizeAnalysisGeneration(analysisGeneration);
  const ledger = dataGatewayContract?.summary
    ? dataGatewayContract
    : summarizeDataGatewayContract(dataGatewayContract);
  const metadataCoverageSummary = summarizeMetadataExtractionCoverage(metadataExtractionCoverage);
  const metadataCoverageDetails = metadataExtractionCoverage && typeof metadataExtractionCoverage === 'object'
    ? metadataExtractionCoverage
    : metadataCoverageSummary;
  const surfaces = Array.isArray(dataGatewayContract?.surfaces)
    ? dataGatewayContract.surfaces.map(compactSurfaceEntry)
    : [];

  const summary = ledger?.summary || {
    total: surfaces.length,
    fresh: 0,
    partial: 0,
    stale: 0,
    missing: 0,
    blocked: 0,
    trustworthy: false,
    nextAction: 'No surface audit data is available.',
    primaryIssue: null
  };

  return {
    generation,
    summary,
    metrics: summarizeSurfaceMetrics({
      databaseHealth,
      metadataExtractionCoverage: metadataCoverageSummary
    }),
    surfaces,
    metadataExtractionCoverage: metadataCoverageDetails,
    details: {
      dataGatewayContract: ledger,
      databaseHealth,
      fileImportEvidenceCoverage,
      systemMapPersistenceCoverage,
      metadataSurfaceParity,
      metadataExtractionCoverage: metadataCoverageDetails,
      semanticSurfaceGranularity,
      fileUniverseGranularity
    }
  };
}
