import {
  loadCompilerDiagnosticsSnapshot,
  summarizeCompilerPolicyDrift,
  buildFolderizationReportFromRepo,
  getDatabaseHealthSummary
} from '../../../shared/compiler/index.js';

export async function loadCompilerExplainability(projectPath, watcherAlerts = [], sharedState = {}, watcherStats = null, folderizationOptions = {}) {
  try {
    const { scanCompilerPolicyDrift } = await import('../../../shared/compiler/index.js');
    const findings = await scanCompilerPolicyDrift(projectPath, { limit: 100 });
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
      databaseHealth: snapshot.databaseHealth,
      driftAssessment: snapshot.driftAssessment,
      surfaceAudit: snapshot.surfaceAudit,
      folderization: {
        candidateReport: folderizationReport.candidateReport,
        familyState: folderizationReport.familyState,
        migrationPlans: folderizationReport.migrationPlans,
        naming: folderizationReport.naming,
        namingPatterns: folderizationReport.namingPatterns,
        creationGuidance: folderizationReport.creationGuidance,
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
      }
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}
