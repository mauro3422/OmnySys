import {
  loadCompilerDiagnosticsSnapshot,
  summarizeCompilerPolicyDrift
} from '../../../shared/compiler/index.js';

export async function loadCompilerExplainability(projectPath, watcherAlerts = [], sharedState = {}) {
  try {
    const { scanCompilerPolicyDrift } = await import('../../../shared/compiler/index.js');
    const findings = await scanCompilerPolicyDrift(projectPath, { limit: 100 });
    const policySummary = summarizeCompilerPolicyDrift(findings);
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    const snapshot = await loadCompilerDiagnosticsSnapshot({
      projectPath,
      db: repo?.db,
      policySummary,
      watcherAlerts,
      sharedState,
      tableCounts: {
        atoms: repo?.db.prepare('SELECT COUNT(*) as n FROM atoms WHERE is_removed IS NULL OR is_removed = 0').get()?.n || 0,
        files: repo?.db.prepare('SELECT COUNT(*) as n FROM files WHERE is_removed IS NULL OR is_removed = 0').get()?.n || 0,
        atom_relations: repo?.db.prepare('SELECT COUNT(*) as n FROM atom_relations WHERE is_removed IS NULL OR is_removed = 0').get()?.n || 0,
        risk_assessments: repo?.db.prepare('SELECT COUNT(*) as n FROM risk_assessments').get()?.n || 0
      }
    });

    return {
      policySummary,
      standardization: snapshot.standardizationReport,
      compilerContractLayer: snapshot.compilerContractLayer,
      persistedFileCoverage: snapshot.persistedFileCoverage,
      fileImportEvidenceCoverage: snapshot.fileImportEvidenceCoverage,
      systemMapPersistenceCoverage: snapshot.systemMapPersistenceCoverage,
      metadataSurfaceParity: snapshot.metadataSurfaceParity,
      semanticCanonicality: snapshot.semanticCanonicality,
      semanticSurfaceGranularity: snapshot.semanticSurfaceGranularity,
      fileUniverseGranularity: snapshot.fileUniverseGranularity
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}
