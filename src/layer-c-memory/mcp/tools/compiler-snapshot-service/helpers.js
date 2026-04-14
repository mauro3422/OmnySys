export function attachCompilerSnapshotContracts({
  snapshot,
  compactSnapshot,
  healthDashboard,
  healthPanel,
  observability,
  observabilitySummary,
  controlPlane,
  controlPlaneSummary,
  systemInventory,
  systemInventoryDetail,
  canonicalPromotion,
  canonicalPromotionDetail,
  compilerExplainability
}) {
  snapshot.observability = observability;
  snapshot.current.observability = observabilitySummary;
  snapshot.controlPlane = controlPlane;
  snapshot.current.controlPlane = controlPlaneSummary;

  compactSnapshot.observability = observabilitySummary;
  compactSnapshot.controlPlane = controlPlaneSummary;

  healthDashboard.observability = observability;
  healthDashboard.controlPlane = controlPlaneSummary;

  healthPanel.observability = observabilitySummary;
  healthPanel.controlPlane = controlPlaneSummary;

  systemInventory.observability = observabilitySummary;
  systemInventory.controlPlane = controlPlaneSummary;

  systemInventoryDetail.observability = observability;
  systemInventoryDetail.controlPlane = controlPlane;

  canonicalPromotion.observability = observabilitySummary;
  canonicalPromotion.controlPlane = controlPlaneSummary;

  canonicalPromotionDetail.observability = observability;
  canonicalPromotionDetail.controlPlane = controlPlane;

  compilerExplainability.controlPlane = controlPlane;

  return {
    snapshot,
    compactSnapshot,
    healthDashboard,
    healthPanel,
    observability,
    observabilitySummary,
    controlPlane,
    controlPlaneSummary,
    systemInventory,
    systemInventoryDetail,
    canonicalPromotion,
    canonicalPromotionDetail,
    compilerExplainability
  };
}

export function buildCompilerSnapshotResult({
  projectPath,
  repo,
  notifications,
  compactNotifications,
  recentErrors,
  compilerExplainability,
  snapshot,
  compactSnapshot,
  systemInventory,
  systemInventoryDetail,
  canonicalPromotion,
  canonicalPromotionDetail,
  observability,
  observabilitySummary,
  controlPlane,
  controlPlaneSummary,
  healthDashboard,
  healthPanel
}) {
  return {
    success: true,
    projectPath,
    repo,
    notifications,
    compactNotifications,
    recentErrors,
    compilerExplainability,
    snapshot,
    compactSnapshot,
    systemInventory,
    systemInventoryDetail,
    canonicalPromotion,
    canonicalPromotionDetail,
    observability,
    observabilitySummary,
    controlPlane,
    controlPlaneSummary,
    healthDashboard,
    healthPanel
  };
}

export default {
  attachCompilerSnapshotContracts,
  buildCompilerSnapshotResult
};
