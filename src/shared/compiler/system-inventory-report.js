export function buildCompilerSystemInventoryReport(inventory = null) {
  if (!inventory || typeof inventory !== 'object') {
    return null;
  }

  const summary = inventory.summary || {};

  return {
    inventoryState: summary.inventoryState || 'watching',
    totalSystemCount: summary.totalSystemCount || 0,
    canonicalSurfaceCount: summary.canonicalSurfaceCount || 0,
    canonicalEntrypointCount: summary.canonicalEntrypointCount || 0,
    emergentSystemCount: summary.emergentSystemCount || 0,
    bridgeSystemCount: summary.bridgeSystemCount || 0,
    wrapperSystemCount: summary.wrapperSystemCount || 0,
    legacySystemCount: summary.legacySystemCount || 0,
    hubSystemCount: summary.hubSystemCount || 0,
    standardizationGapCount: summary.standardizationGapCount || 0,
    missingCanonicalApiCount: summary.missingCanonicalApiCount || 0,
    missingCanonicalSurfaceCount: summary.missingCanonicalSurfaceCount || 0,
    policyDriftCount: summary.policyDriftCount || 0,
    integrationCoveragePct: summary.integrationCoveragePct || 0,
    contractWrapperFindings: summary.contractWrapperFindings || 0,
    contractParallelSurfaceFindings: summary.contractParallelSurfaceFindings || 0,
    surfaceAuditTrustworthy: summary.surfaceAuditTrustworthy === true,
    dataGatewayTrustworthy: summary.dataGatewayTrustworthy === true,
    metadataCoveragePct: summary.metadataCoveragePct || summary.metadataFieldCoveragePct || 0,
    metadataFieldCoveragePct: summary.metadataFieldCoveragePct || 0,
    integrationCoveragePct: summary.integrationCoveragePct || 0,
    propagationExpansionState: summary.propagationExpansionState || null,
    dominantToolCategory: summary.dominantToolCategory || null,
    dominantToolSubgroup: summary.dominantToolSubgroup || null,
    toolConcentration: summary.toolConcentration || 0,
    toolCategoryConcentration: summary.toolCategoryConcentration || 0,
    noiseScore: summary.noiseScore || 0,
    noisyToolCount: summary.noisyToolCount || 0,
    policyCoverageState: summary.policyCoverageState || null,
    policyCoverageScore: summary.policyCoverageScore || 0,
    policyCoverageRatio: summary.policyCoverageRatio || 0,
    policyCoverageDriftCount: summary.policyCoverageDriftCount || 0,
    policyCoveragePropagationState: summary.policyCoveragePropagationState || null,
    kindCounts: summary.kindCounts || {},
    historyStoreState: summary.historyStoreState || null,
    historyStoreCount: summary.historyStoreCount || 0,
    historyStoreReadyCount: summary.historyStoreReadyCount || 0,
    historyStoreMissingCount: summary.historyStoreMissingCount || 0,
    lineageReconciliation: summary.lineageReconciliation || null,
    historyStores: summary.historyStores || null,
    nextAction: summary.nextAction || null,
    summaryText: summary.summaryText || null,
    topSystems: Array.isArray(summary.topSystems) ? summary.topSystems.slice(0, 8) : [],
    topPromotionCandidates: Array.isArray(summary.topPromotionCandidates) ? summary.topPromotionCandidates.slice(0, 5) : [],
    tooling: inventory.tooling || null,
    policyCoverage: inventory.policyCoverage || null,
    historyStores: summary.historyStores || null,
    lineageReconciliation: summary.lineageReconciliation || null
  };
}

export default {
  buildCompilerSystemInventoryReport
};
