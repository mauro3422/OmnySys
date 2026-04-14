export function buildCanonicalPromotionResponse({
  promotion,
  promotionDetail,
  inventoryResult,
  folderizationResult
}) {
  return {
    success: true,
    aggregationType: 'canonical_promotion',
    promotion,
    promotionDetail,
    propagation: promotionDetail?.folderization?.propagation
      || inventoryResult.compactSnapshot?.current?.folderizationPropagation
      || inventoryResult.compactSnapshot?.folderizationPropagation
      || null,
    inventory: inventoryResult.systemInventoryDetail || null,
    folderization: folderizationResult?.folderizationReport || null,
    snapshot: inventoryResult.compactSnapshot,
    dashboard: inventoryResult.healthDashboard,
    summary: promotion?.summaryText || promotion?.nextAction || null,
    topPromotionTargets: promotion?.topPromotionTargets || [],
    systemInventory: inventoryResult.systemInventory || null,
    canonicalPromotion: inventoryResult.canonicalPromotion || null,
    compilerExplainability: inventoryResult.compilerExplainability ? {
      systemInventory: inventoryResult.compilerExplainability.systemInventory || null,
      canonicalPromotion: inventoryResult.compilerExplainability.canonicalPromotion || null,
      standardization: inventoryResult.compilerExplainability.standardization || null,
      compilerContractLayer: inventoryResult.compilerExplainability.compilerContractLayer || null,
      surfaceAudit: inventoryResult.compilerExplainability.surfaceAudit || null,
      driftAssessment: inventoryResult.compilerExplainability.driftAssessment || null
    } : null
  };
}
