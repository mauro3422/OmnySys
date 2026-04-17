import {
  loadCompilerDiagnosticsSnapshot,
} from './snapshot.js';
import { buildCompilerSystemInventorySnapshot } from './system-inventory/summary.js';
import { summarizeCompilerPolicyDrift } from './policy-conformance/summary.js';
import { buildFolderizationReportFromRepo } from './folderization-report.js';
import { buildFolderizationAutomationSummaryFromReport } from './folderization-automation-summary.js';
import { getDatabaseHealthSummary } from './database-health-summary.js';
import { validateMetricCoherence } from './metric-coherence-validator.js';
import { buildPropagationLedger } from './propagation-ledger.js';
import { buildSemanticGranularityComparison } from './semantic-granularity-api.js';
import {
  getCompilerPolicyCodeHash,
  shouldForceRescan,
  setLastPolicyCodeHash
} from './compiler-explainability-cache.js';
import { buildCanonicalPromotionReport, buildCanonicalPromotionSnapshot } from './canonical-promotion-summary.js';
import { buildCompilerSystemInventoryReport } from './system-inventory/summary.js';

function publishCompilerExplainabilityRefresh(sharedState = {}, compilerExplainability = null, projectPath = null) {
  if (!sharedState || typeof sharedState !== 'object' || !compilerExplainability) {
    return compilerExplainability;
  }

  const refreshedAt = new Date().toISOString();
  const currentHash = projectPath ? getCompilerPolicyCodeHash(projectPath) : null;
  compilerExplainability._compilerPolicyCodeHash = currentHash;
  setLastPolicyCodeHash(currentHash);

  const policyDriftCount = compilerExplainability.policySummary?.effectiveTotal
    ?? compilerExplainability.policySummary?.total
    ?? compilerExplainability.policyCoverage?.policyDriftCount
    ?? compilerExplainability.systemInventory?.policyDriftCount
    ?? 0;
  const policyCoverageState = compilerExplainability.policyCoverage?.coverageState
    || compilerExplainability.systemInventory?.policyCoverage?.coverageState
    || null;
  const propagationExpansionState = compilerExplainability.policyCoverage?.propagationExpansionState
    || compilerExplainability.driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')?.state
    || compilerExplainability.driftAssessment?.primaryIssue?.state
    || null;

  sharedState.compilerExplainability = compilerExplainability;
  sharedState.compilerExplainabilityRefreshedAt = refreshedAt;
  sharedState.compilerExplainabilityRefreshSource = 'compiler_explainability_loader';
  sharedState.compilerExplainabilityDirty = false;
  sharedState.policySummary = compilerExplainability.policySummary || null;
  sharedState.policyDriftCount = policyDriftCount;
  sharedState.policyCoverageState = policyCoverageState;
  sharedState.propagationExpansionState = propagationExpansionState;
  sharedState.systemInventorySnapshot = compilerExplainability.systemInventory || null;
  sharedState.systemInventoryReport = compilerExplainability.systemInventory
    ? buildCompilerSystemInventoryReport(compilerExplainability.systemInventory)
    : null;
  sharedState.canonicalPromotionSnapshot = compilerExplainability.canonicalPromotion || null;
  sharedState.canonicalPromotionReport = compilerExplainability.canonicalPromotion
    ? buildCanonicalPromotionReport(compilerExplainability.canonicalPromotion)
    : null;

  return {
    ...compilerExplainability,
    refreshedAt,
    refreshSource: 'compiler_explainability_loader'
  };
}

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

export async function loadCompilerExplainability(projectPath, watcherAlerts = [], sharedState = {}, watcherStats = null, folderizationOptions = {}) {
  try {
    const existingExplainability = sharedState?.compilerExplainability || null;
    const forceRescan = shouldForceRescan(projectPath, existingExplainability);
    const forceFresh = folderizationOptions?.forceFresh === true;

    if (existingExplainability && !forceRescan && !forceFresh) {
      return publishCompilerExplainabilityRefresh(sharedState, existingExplainability, projectPath);
    }

    let policySummary;
    if (forceRescan && existingExplainability?.policySummary) {
      const { scanCompilerPolicyDrift } = await import('./scan.js');
      const findings = await scanCompilerPolicyDrift(projectPath, { limit: 1000 });
      policySummary = summarizeCompilerPolicyDrift(findings);
    } else if (existingExplainability?.policySummary) {
      policySummary = existingExplainability.policySummary;
    } else {
      const { scanCompilerPolicyDrift } = await import('./scan.js');
      const findings = await scanCompilerPolicyDrift(projectPath, { limit: 1000 });
      policySummary = summarizeCompilerPolicyDrift(findings);
    }

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
    const canonicalPromotion = buildCanonicalPromotionSnapshot({
      projectPath,
      systemInventory
    });
    const propagationAdoptionTargets = buildFolderizationPropagationAdoptionTargets({
      snapshot,
      systemInventory,
      folderizationReport,
      databaseHealth,
      watcherStats,
      watcherAlerts
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

    const semanticGranularityComparison = repo?.db
      ? buildSemanticGranularityComparison({
          db: repo.db,
          compilerExplainability: {
            semanticSurfaceGranularity: snapshot.semanticSurfaceGranularity
          },
          source: 'compiler_explainability_loader'
        })
      : null;

    const propagationLedger = buildPropagationLedger({
      compilerExplainability: {
        policySummary,
        policyCoverage: systemInventory.policyCoverage || null,
        driftAssessment: snapshot.driftAssessment
      },
      systemInventory,
      sharedState,
      source: 'compiler_explainability_loader',
      watcherStats,
      watcherAlerts
    });

    return publishCompilerExplainabilityRefresh(sharedState, {
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
      semanticGranularityComparison,
      fileUniverseGranularity: snapshot.fileUniverseGranularity,
      analysisGeneration: snapshot.analysisGeneration,
      watcherStats,
      dataGatewayContract: snapshot.dataGatewayContract,
      databaseHealth,
      driftAssessment: snapshot.driftAssessment,
      surfaceAudit: snapshot.surfaceAudit,
      metricCoherence,
      inventorySignals: sharedState.inventorySignals || null,
      systemInventory,
      systemInventoryReport: buildCompilerSystemInventoryReport(systemInventory),
      canonicalPromotion,
      canonicalPromotionReport: buildCanonicalPromotionReport(canonicalPromotion),
      propagationLedger,
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
    }, projectPath);
  } catch (error) {
    return {
      error: error.message
    };
  }
}

export default {
  loadCompilerExplainability
};
