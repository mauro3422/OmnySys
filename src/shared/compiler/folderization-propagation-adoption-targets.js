function buildFolderizationPropagationAdoptionTargets({
  snapshot,
  systemInventory,
  folderizationReport,
  databaseHealth,
  watcherStats,
  watcherAlerts = []
}) {
  const hasWatcherSurface = true;
  const hasRenameSurface = Boolean(
    folderizationReport?.normalization
    || folderizationReport?.naming
    || folderizationReport?.familyState
  );
  const hasHealthSnapshotSurface = Boolean(
    snapshot?.driftAssessment
    || snapshot?.dataGatewayContract
    || snapshot?.metadataExtractionCoverage
  );
  const hasCachePolicySurface = Boolean(
    watcherStats
    || databaseHealth
    || snapshot?.driftAssessment
  );
  const exposedSurfaces = [
    { name: 'compiler_explainability', role: 'explainability', source: 'compilerExplainability', available: true },
    { name: 'compiler_health_dashboard', role: 'dashboard', source: 'health dashboard', available: true },
    { name: 'compiler_metrics_snapshot', role: 'metrics', source: 'metrics snapshot', available: true },
    { name: 'status_system_table', role: 'status', source: 'status system table', available: true },
    { name: 'status_summary_payload', role: 'status', source: 'status summary payload', available: true },
    { name: 'status_panel', role: 'status', source: 'status panel', available: true },
    { name: 'technical_debt_report', role: 'debt', source: 'technical debt report', available: true },
    { name: 'system_inventory', role: 'inventory', source: 'systemInventory', available: Boolean(systemInventory) },
    { name: 'policy_coverage', role: 'policy', source: 'systemInventory.policyCoverage', available: Boolean(systemInventory?.policyCoverage) },
    { name: 'canonical_promotion', role: 'promotion', source: 'systemInventory.canonicalPromotion', available: Boolean(systemInventory?.canonicalPromotion) },
    { name: 'folderization', role: 'folderization', source: 'compilerExplainability.folderization', available: Boolean(folderizationReport) },
    { name: 'rename_folderized_family', role: 'normalizer', source: 'folderization.normalization', available: hasRenameSurface },
    { name: 'health_snapshot', role: 'history', source: 'mcp_omnysystem_get_health_snapshot', available: hasHealthSnapshotSurface },
    { name: 'cache_policy', role: 'freshness', source: 'cache policy advisor', available: hasCachePolicySurface },
    { name: 'watcher', role: 'reconciliation', source: 'watcher diagnostics / watcherStats', available: hasWatcherSurface },
    { name: 'propagation', role: 'propagation', source: 'compilerExplainability.folderization.propagation', available: Boolean(folderizationReport?.propagation) },
    { name: 'standardization', role: 'governance', source: 'standardizationReport', available: Boolean(snapshot.standardizationReport) },
    { name: 'compiler_contract_layer', role: 'governance', source: 'compilerContractLayer', available: Boolean(snapshot.compilerContractLayer) },
    { name: 'data_gateway_contract', role: 'governance', source: 'dataGatewayContract', available: Boolean(snapshot.dataGatewayContract) },
    { name: 'metadata_extraction_coverage', role: 'coverage', source: 'metadataExtractionCoverage', available: Boolean(snapshot.metadataExtractionCoverage) },
    { name: 'surface_audit', role: 'audit', source: 'surfaceAudit', available: Boolean(snapshot.surfaceAudit) },
    { name: 'drift_assessment', role: 'drift', source: 'driftAssessment', available: Boolean(snapshot.driftAssessment) },
    { name: 'database_health', role: 'health', source: 'databaseHealth', available: Boolean(databaseHealth) },
    { name: 'metrics_snapshot', role: 'metrics', source: 'compilerExplainability.metricsSnapshot', available: true }
  ].filter((item) => item.available);

  const inventoryTopSystems = Array.isArray(systemInventory?.topSystems)
    ? systemInventory.topSystems.map((item) => ({
      name: item?.name || item?.surface || item?.entrypoint || item?.id || null,
      role: item?.role || item?.kind || 'inventory'
    })).filter((item) => item.name)
    : [];

  return [...exposedSurfaces, ...inventoryTopSystems];
}

export { buildFolderizationPropagationAdoptionTargets };

export default {
  buildFolderizationPropagationAdoptionTargets
};
