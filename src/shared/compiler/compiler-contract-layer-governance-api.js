/**
 * @fileoverview Governance API rules for the compiler contract layer.
 *
 * @module shared/compiler/compiler-contract-layer-governance-api
 */

import { buildCanonicalGovernanceMetrics } from './compiler-contract-layer-governance-metrics.js';

export function buildApiGovernance(standardization = null, invariants = [], policySummary = {}) {
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
