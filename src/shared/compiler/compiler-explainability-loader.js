import {
  loadCompilerDiagnosticsSnapshot,
} from './snapshot.js';
import { buildCompilerSystemInventorySnapshot } from './system-inventory-summary.js';
import { summarizeCompilerPolicyDrift } from './policy-conformance-summary.js';
import { buildFolderizationReportFromRepo } from './folderization-report.js';
import { buildFolderizationAutomationSummaryFromReport } from './folderization-automation-summary.js';
import { getDatabaseHealthSummary } from './database-health-summary.js';
import { validateMetricCoherence } from './metric-coherence-validator.js';

function buildFolderizationPropagationAdoptionTargets({
  snapshot,
  systemInventory,
  folderizationReport,
  databaseHealth
}) {
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

export async function loadCompilerExplainability(projectPath, watcherAlerts = [], sharedState = {}, watcherStats = null, folderizationOptions = {}) {
  try {
    const { scanCompilerPolicyDrift } = await import('./scan.js');
    const findings = await scanCompilerPolicyDrift(projectPath, { limit: 1000 });
    const policySummary = summarizeCompilerPolicyDrift(findings);
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    const databaseHealth = repo?.db ? getDatabaseHealthSummary(repo.db) : null;
    const tableCounts = databaseHealth?.metrics ? {
      atoms: databaseHealth.metrics.activeAtoms || 0,
      files: databaseHealth.metrics.activeFiles || 0,
      atom_relations: databaseHealth.metrics.activeCallRelations || 0,
      risk_assessments: databaseHealth.metrics.activeRiskRows || 0
    } : {};
    const snapshot = await loadCompilerDiagnosticsSnapshot({
      projectPath,
      db: repo?.db,
      policySummary,
      watcherAlerts,
      sharedState,
      tableCounts
    });

    const folderizationReport = buildFolderizationReportFromRepo(repo, folderizationOptions);
    const systemInventory = buildCompilerSystemInventorySnapshot({
      projectPath,
      compilerExplainability: {
        standardization: snapshot.standardizationReport,
        compilerContractLayer: snapshot.compilerContractLayer,
        policySummary,
        dataGatewayContract: snapshot.dataGatewayContract,
        metadataExtractionCoverage: snapshot.metadataExtractionCoverage,
        surfaceAudit: snapshot.surfaceAudit,
        driftAssessment: snapshot.driftAssessment,
        inventorySignals: sharedState.inventorySignals || null
      }
    });
    const propagationAdoptionTargets = buildFolderizationPropagationAdoptionTargets({
      snapshot,
      systemInventory,
      folderizationReport,
      databaseHealth
    });
    const propagationAdoptionRequiredSystems = Array.isArray(systemInventory?.topSystems) ? systemInventory.topSystems : [];
    const folderizationAutomation = buildFolderizationAutomationSummaryFromReport(folderizationReport, {
      systemInventory,
      policyCoverage: systemInventory.policyCoverage || null,
      canonicalPromotion: systemInventory.canonicalPromotion || null,
      propagationAdoptionTargets,
      propagationAdoptionRequiredSystems
    });

    const metricCoherence = repo?.db
      ? validateMetricCoherence({
          compilerExplainability: {
            databaseHealth,
            fileUniverseGranularity: snapshot.fileUniverseGranularity
          },
          repo
        })
      : null;

    return {
      policySummary,
      standardization: snapshot.standardizationReport,
      compilerContractLayer: snapshot.compilerContractLayer,
      persistedFileCoverage: snapshot.persistedFileCoverage,
      fileImportEvidenceCoverage: snapshot.fileImportEvidenceCoverage,
      systemMapPersistenceCoverage: snapshot.systemMapPersistenceCoverage,
      metadataSurfaceParity: snapshot.metadataSurfaceParity,
      metadataExtractionCoverage: snapshot.metadataExtractionCoverage,
      semanticCanonicality: snapshot.semanticCanonicality,
      semanticSurfaceGranularity: snapshot.semanticSurfaceGranularity,
      fileUniverseGranularity: snapshot.fileUniverseGranularity,
      analysisGeneration: snapshot.analysisGeneration,
      watcherStats,
      dataGatewayContract: snapshot.dataGatewayContract,
      databaseHealth,
      driftAssessment: snapshot.driftAssessment,
      surfaceAudit: snapshot.surfaceAudit,
      metricCoherence,
      inventorySignals: sharedState.inventorySignals || null,
      folderization: {
        candidateReport: folderizationReport.candidateReport,
        familyState: folderizationReport.familyState,
        migrationPlans: folderizationReport.migrationPlans,
        naming: folderizationReport.naming,
        normalization: folderizationReport.normalization,
        namingPatterns: folderizationReport.namingPatterns,
        creationGuidance: folderizationReport.creationGuidance,
        automation: folderizationAutomation,
        propagationAdoptionTargets,
        propagationAdoptionRequiredSystems,
        namingDebt: {
          familyCount: folderizationReport.naming?.familyCount || 0,
          renameTargetCount: folderizationReport.naming?.renameTargetCount || 0,
          renameTargetDensity: folderizationReport.naming?.familyCount
            ? Math.round((folderizationReport.naming?.renameTargetCount || 0) / folderizationReport.naming.familyCount * 100) / 100
            : 0
        },
        recommendation: folderizationReport.recommendation,
        decision: folderizationReport.decision,
        summary: folderizationReport.summary
      },
      systemInventory,
      policyCoverage: systemInventory.policyCoverage || null
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

export default {
  loadCompilerExplainability
};
