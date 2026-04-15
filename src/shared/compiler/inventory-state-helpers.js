/**
 * Inventory state calculation helpers.
 * Extracted from buildCompilerObservabilityContract to reduce complexity.
 */

import { normalizeState } from './signal-state-helpers.js';
import { normalizeCount } from './contract-helpers.js';

function calculateInventoryIssueCount(inventoryCompact) {
  return normalizeCount(inventoryCompact.policyDriftCount)
    + normalizeCount(inventoryCompact.missingCanonicalApiCount)
    + normalizeCount(inventoryCompact.missingCanonicalSurfaceCount)
    + normalizeCount(inventoryCompact.standardizationGapCount);
}

function determineInventoryState(issueCount) {
  if (issueCount >= 5) return 'blocked';
  if (issueCount >= 3) return 'stale';
  if (issueCount > 0) return 'watching';
  return 'fresh';
}

function isInventoryHealthy(issueCount) {
  return issueCount < 3;
}

export function buildInventoryState(inventoryCompact) {
  const inventoryIssueCount = calculateInventoryIssueCount(inventoryCompact);
  const state = determineInventoryState(inventoryIssueCount);
  const healthy = isInventoryHealthy(inventoryIssueCount);

  return {
    state,
    healthy,
    trustworthy: healthy,
    reason: inventoryIssueCount > 0
      ? 'Inventory is missing canonical surfaces or still carries policy drift.'
      : inventoryCompact.nextAction || 'Canonical inventory surfaces are aligned.',
    recommendation: inventoryCompact.nextAction
      || 'Keep adopting the existing canonical families consistently.',
    sourceOfTruth: 'system inventory',
    inventoryState: normalizeState(inventoryCompact.inventoryState, 'missing'),
    inventoryIssueCount,
    policyCoverageState: inventoryCompact.policyCoverageState || null,
    policyCoverageScore: inventoryCompact.policyCoverageScore || 0,
    integrationCoveragePct: inventoryCompact.integrationCoveragePct || 0,
    metadataCoveragePct: inventoryCompact.metadataCoveragePct || 0,
    historyStoreState: inventoryCompact.historyStoreState || null,
    historyStoreCount: inventoryCompact.historyStoreCount || 0
  };
}
