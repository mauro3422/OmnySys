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
  buildInvariant,
  buildSurface,
  buildSurfaceInventory,
  normalizeCount
} from './compiler-contract-layer-helpers.js';
import { buildDerivedFeatureRegistry } from './derived-feature-registry.js';
import { summarizeDataGatewayContract } from './data-gateway-contract.js';

function buildCanonicalGovernanceMetrics(policySummary = {}, standardization = null) {
  const byRule = policySummary?.byRule || {};
  const byArea = policySummary?.byPolicyArea || {};
  const missingCanonicalApiCount = normalizeCount(standardization?.summary?.missingCanonicalApiCount);
  const missingCanonicalSurfaceCount = normalizeCount(standardization?.summary?.missingCanonicalSurfaceCount);

  const canonicalWrapperFindings = normalizeCount(byRule.local_canonical_wrapper);
  const canonicalBarrelFindings = normalizeCount(byRule.local_barrel_with_logic);
  const canonicalBypassFindings =
    normalizeCount(byRule.canonical_diagnostics_bypass) +
    normalizeCount(byArea.canonical_bypass);
  const parallelCanonicalSurfaceFindings =
    normalizeCount(byRule.local_canonical_helper_without_barrel) +
    normalizeCount(byRule.private_compiler_helper_import) +
    canonicalBarrelFindings +
    missingCanonicalApiCount +
    missingCanonicalSurfaceCount;

  const totalFindings =
    canonicalWrapperFindings +
    canonicalBypassFindings +
    parallelCanonicalSurfaceFindings;

  return {
    totalFindings,
    canonicalWrapperFindings,
    canonicalBarrelFindings,
    canonicalBypassFindings,
    parallelCanonicalSurfaceFindings,
    missingCanonicalApiCount,
    missingCanonicalSurfaceCount,
    healthy: totalFindings === 0,
    nextAction: totalFindings > 0
      ? 'Consolidate the active canonical drift findings before adding new wrappers, mixed barrels or policy surfaces.'
      : 'No active canonical drift findings; keep extending the existing canonical surfaces.'
  };
}

function buildInvariants({
  persistedFileCoverage = null,
  fileUniverseGranularity = null,
  metadataSurfaceParity = null,
  semanticCanonicality = null,
  semanticSurfaceGranularity = null,
  systemMapPersistenceCoverage = null,
  tableCounts = {}
} = {}) {
  return [
    buildInvariant({
      id: 'primary_file_metadata_surface',
      status: normalizeCount(tableCounts.files) > 0 ? 'pass' : 'fail',
      severity: 'high',
      message: 'The `files` table is the primary file-level metadata surface.',
      recommendedAction: 'Do not promote mirrored support tables to primary truth; repopulate `files` first if it is empty.',
      evidence: { rows: normalizeCount(tableCounts.files) }
    }),
    buildInvariant({
      id: 'scanner_manifest_alignment',
      status: fileUniverseGranularity?.healthy === false || persistedFileCoverage?.synchronized === false ? 'fail' : 'pass',
      severity: 'high',
      message: 'Discovered files, persisted scanner manifest, and live index must stay aligned through the scanned-file manifest contract.',
      recommendedAction: 'Run scanner discovery through syncPersistedScannedFileManifest before reporting file-universe counts.',
      evidence: {
        persistedFileCoverage,
        fileUniverseGranularity
      }
    }),
    buildInvariant({
      id: 'semantic_summary_is_not_detail',
      status: semanticSurfaceGranularity?.materiallyDrifting === true ? 'fail' : 'pass',
      severity: 'high',
      message: 'File-level semantic summaries must never be treated as equivalent to atom-level semantic relations.',
      recommendedAction: 'Use atoms semantic metadata as source of truth and pass semantic_connections through getSemanticSurfaceGranularity.',
      evidence: {
        semanticCanonicality,
        semanticSurfaceGranularity
      }
    }),
    buildInvariant({
      id: 'mirrored_metadata_requires_parity',
      status: metadataSurfaceParity?.healthy === false ? 'fail' : 'pass',
      severity: 'medium',
      message: 'Mirrored metadata support tables must preserve enough richness to back file-level queries safely.',
      recommendedAction: 'Check getMetadataSurfaceParity before serving mirrored metadata as if it were primary.',
      evidence: metadataSurfaceParity || {}
    }),
    buildInvariant({
      id: 'system_map_support_alignment',
      status: systemMapPersistenceCoverage?.healthy === false ? 'fail' : 'pass',
      severity: 'medium',
      message: 'system_files/file_dependencies must stay aligned with canonical persistence and graph output.',
      recommendedAction: 'Repair or validate system-map persistence coverage before legacy queries rely on support tables.',
      evidence: systemMapPersistenceCoverage || {}
    })
  ];
}

function buildApiGovernance(standardization = null, invariants = [], policySummary = {}) {
  const missingCanonicalApis = standardization?.missingCanonicalApis || [];
  const missingCanonicalSurfaces = standardization?.missingCanonicalSurfaces || [];
  const failedInvariantCount = invariants.filter((item) => item.status === 'fail').length;
  const governanceMetrics = buildCanonicalGovernanceMetrics(policySummary, standardization);

  const shouldCreateCanonicalApi =
    missingCanonicalApis.length > 0 ||
    missingCanonicalSurfaces.length > 0 ||
    governanceMetrics.parallelCanonicalSurfaceFindings > 0;

  const shouldBlockNewWrappers =
    failedInvariantCount > 0 ||
    shouldCreateCanonicalApi ||
    governanceMetrics.canonicalWrapperFindings > 0 ||
    governanceMetrics.canonicalBypassFindings > 0;

  return {
    shouldCreateCanonicalApi,
    shouldBlockNewWrappers,
    contractTaxonomy: standardization?.contractTaxonomy || null,
    currentCreationCandidates: missingCanonicalApis,
    missingCanonicalSurfaces,
    governanceMetrics,
    creationRules: [
      'Create a new canonical API only when two or more runtime/MCP surfaces are recomputing the same contract or when standardization reports a missing canonical API.',
      'Do not create a wrapper if an existing canonical entrypoint already exposes the needed truth surface.',
      'If a new API is introduced, deprecate or migrate the parallel wrapper in the same workstream.',
      'Never expose advisory or mirrored support tables without also exposing their contract and backing source of truth.'
    ],
    antiWrapperRules: [
      'No new wrapper without deprecating the old wrapper.',
      'No direct reads from advisory/legacy tables when a canonical contract helper already exists.',
      'No totals comparison across surfaces with different granularity unless the contract explicitly says they are equivalent.'
    ],
    nextAction: governanceMetrics.totalFindings > 0
      ? governanceMetrics.nextAction
      : (standardization?.summary?.nextAction || 'Adopt existing canonical families before creating a new one.')
  };
}

export function buildCompilerContractLayer({
  persistedFileCoverage = null,
  fileUniverseGranularity = null,
  metadataSurfaceParity = null,
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
