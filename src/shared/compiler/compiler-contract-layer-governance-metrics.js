/**
 * @fileoverview Governance metrics for the compiler contract layer.
 *
 * @module shared/compiler/compiler-contract-layer-governance-metrics
 */

import { normalizeCount } from './compiler-contract-layer-helpers.js';

export function buildCanonicalGovernanceMetrics(policySummary = {}, standardization = null) {
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
