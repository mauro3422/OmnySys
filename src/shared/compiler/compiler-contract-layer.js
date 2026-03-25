/**
 * @fileoverview Explicit compiler contract layer.
 *
 * Consolidates the current canonical/advisory/legacy surfaces, the canonical
 * compiler entrypoints, and the invariants that must hold before runtime/MCP
 * code should trust a surface as source of truth.
 *
 * This is intentionally built on top of existing canonical helpers rather than
 * introducing another parallel governance API.
 *
 * @module shared/compiler/compiler-contract-layer
 */

import {
  buildCanonicalEntrypoints,
  buildSurface,
  buildSurfaceInventory
} from './compiler-contract-layer-helpers.js';
import { buildDerivedFeatureRegistry } from './derived-feature-registry.js';
import { summarizeDataGatewayContract } from './data-gateway-contract.js';
import { buildApiGovernance, buildInvariants } from './compiler-contract-layer-governance.js';

export function buildCompilerContractLayer({
  persistedFileCoverage = null,
  fileUniverseGranularity = null,
  metadataSurfaceParity = null,
  metadataExtractionCoverage = null,
  semanticSurfaceGranularity = null,
  semanticCanonicality = null,
  systemMapPersistenceCoverage = null,
  dataGatewayContract = null,
  standardization = null,
  policySummary = {},
  tableCounts = {}
} = {}) {
  const derivedFeatureRegistry = buildDerivedFeatureRegistry();
  const surfaces = buildSurfaceInventory({
    persistedFileCoverage,
    fileUniverseGranularity,
    metadataSurfaceParity,
    metadataExtractionCoverage,
    semanticSurfaceGranularity,
    semanticCanonicality,
    systemMapPersistenceCoverage,
    tableCounts
  });

  const invariants = buildInvariants({
    persistedFileCoverage,
    fileUniverseGranularity,
    metadataSurfaceParity,
    semanticCanonicality,
    semanticSurfaceGranularity,
    systemMapPersistenceCoverage,
    tableCounts
  });

  const apiGovernance = buildApiGovernance(standardization, invariants, policySummary);
  const canonicalEntrypoints = buildCanonicalEntrypoints();
  const derivedFeatureSummary = derivedFeatureRegistry.summary;
  const dataGatewaySummary = summarizeDataGatewayContract(dataGatewayContract);
  const failedInvariantCount = invariants.filter((item) => item.status === 'fail').length;
  const advisorySurfaceCount = surfaces.filter((item) => item.status === 'advisory' || item.status === 'advisory_only').length;
  const supportSurfaceCount = surfaces.filter((item) => item.status === 'mirrored_support').length;

  return {
    version: 1,
    summary: {
      canonicalSurfaceCount: surfaces.filter((item) => item.sourceOfTruth).length,
      advisorySurfaceCount,
      supportSurfaceCount,
      failedInvariantCount,
      derivedFeatureCount: derivedFeatureSummary.total,
      derivedFeatureFamilies: derivedFeatureSummary.byFamily,
      canonicalWrapperFindings: apiGovernance.governanceMetrics.canonicalWrapperFindings,
      canonicalBarrelFindings: apiGovernance.governanceMetrics.canonicalBarrelFindings,
      canonicalBypassFindings: apiGovernance.governanceMetrics.canonicalBypassFindings,
      parallelCanonicalSurfaceFindings: apiGovernance.governanceMetrics.parallelCanonicalSurfaceFindings,
      contractTaxonomyCoverage: standardization?.contractTaxonomy?.coverage?.coverageRatio ?? 0,
      dataGatewayContractTrustworthy: dataGatewaySummary?.trustworthy === true,
      dataGatewayContractState: dataGatewaySummary?.primaryIssue?.state || (dataGatewaySummary?.trustworthy === true ? 'trustworthy' : 'needs_attention'),
      healthy: failedInvariantCount === 0,
      mode: failedInvariantCount === 0 ? 'explicit_contract' : 'contract_violation',
      nextAction: apiGovernance.nextAction
    },
    surfaces,
    canonicalEntrypoints,
    derivedFeatures: derivedFeatureSummary,
    invariants,
    apiGovernance,
    governanceContracts: {
      dataGatewayContract: dataGatewaySummary
    }
  };
}
