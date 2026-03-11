import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import {
  buildCompilerReadinessStatus,
  getAtomCountSummary,
  getConceptualDuplicateSummary,
  getFileUniverseSummary,
  getGraphCoverageSummary,
  getIssueSummary,
  getLastAnalyzed,
  getMcpSessionSummary,
  getPhase2FileCounts,
  getSharedStateContentionSummary,
  loadCompilerDiagnosticsSnapshot,
  summarizeCompilerPolicyDrift
} from '../../../shared/compiler/index.js';

export async function loadMetadataStatus(projectPath) {
  try {
    const metadata = await getProjectMetadata(projectPath);
    const statusMetadata = {
      totalFiles: metadata?.stats?.totalFiles || metadata?.totalFiles || 0,
      totalFunctions: metadata?.stats?.totalAtoms || metadata?.totalFunctions || 0,
      lastAnalyzed: getLastAnalyzed(metadata)
    };

    try {
      const { getRepository } = await import('#layer-c/storage/repository/index.js');
      const repo = getRepository(projectPath);
      if (repo?.db) {
        const atomSummary = getAtomCountSummary(repo.db);
        const phase2Counts = getPhase2FileCounts(repo.db);
        statusMetadata.liveAtomCount = atomSummary.totalAtoms;
        statusMetadata.liveFileCount = phase2Counts.liveFileCount;
        statusMetadata.phase2PendingFiles = phase2Counts.pendingFiles;
        statusMetadata.phase2CompletedFiles = phase2Counts.completedFiles;
        statusMetadata.societiesCount = repo.db.prepare('SELECT COUNT(*) as n FROM societies').get()?.n || 0;
      }
    } catch {
      // Repo not ready yet; live counts remain omitted.
    }

    return statusMetadata;
  } catch (error) {
    return { error: 'Metadata not available', message: error.message };
  }
}

export async function attachDeepVitals(status, projectPath, server) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const { sessionManager } = await import('../core/session-manager.js');
    const repo = getRepository(projectPath);
    if (!repo?.db) {
      return;
    }

    const sharedStateSummary = getSharedStateContentionSummary(repo.db);
    status.sharedState = {
      activeSocietiesBadge: sharedStateSummary.actorCount > 0 ? 'RADIOACTIVE' : 'CLEAN',
      actorCount: sharedStateSummary.actorCount,
      totalLinks: sharedStateSummary.totalLinks,
      maxContention: sharedStateSummary.maxContention,
      hottestKey: sharedStateSummary.hottestKey,
      topContentionKeys: sharedStateSummary.topContentionKeys
    };

    const phase2Counts = getPhase2FileCounts(repo.db);
    const graphCoverage = getGraphCoverageSummary(repo.db);
    const issueSummary = getIssueSummary(repo.db);
    const fileUniverseSummary = getFileUniverseSummary(repo.db);
    const conceptualSummary = getConceptualDuplicateSummary(repo, { limit: 50 });
    const sessionSummary = getMcpSessionSummary(sessionManager, {
      runtimeSessionCount: server.sessions?.size || 0
    });

    status.background = {
      phase2PendingFiles: phase2Counts.pendingFiles,
      phase2CompletedFiles: phase2Counts.completedFiles,
      societiesCount: repo.db.prepare('SELECT COUNT(*) as n FROM societies').get()?.n || 0,
      graphCoverage,
      fileUniverseSummary: {
        scannedFileTotal: fileUniverseSummary.scannedFileTotal,
        liveFileCount: fileUniverseSummary.liveFileCount,
        zeroAtomFileCount: fileUniverseSummary.zeroAtomFileCount,
        liveCoverageRatio: fileUniverseSummary.liveCoverageRatio
      },
      conceptualDuplicates: {
        actionableGroups: conceptualSummary.actionableGroups,
        rawGroups: conceptualSummary.rawGroups,
        actionableRatio: conceptualSummary.actionableRatio,
        actionableImplementations: conceptualSummary.actionableImplementations,
        rawImplementations: conceptualSummary.rawImplementations
      },
      issueSummary: {
        total: issueSummary.total,
        display: issueSummary.display,
        orphanCount: issueSummary.orphanCount,
        suspiciousDeadCandidates: issueSummary.suspiciousDeadCandidates
      },
      mcpSessionSummary: sessionSummary
    };

    status.mcpSessions = {
      totalActive: sessionSummary.runtimeSessions,
      totalPersistent: sessionSummary.totalPersistent,
      totalPersistentActive: sessionSummary.totalPersistentActive,
      uniqueClients: sessionSummary.uniqueClients,
      clientsWithDuplicates: sessionSummary.clientsWithDuplicates,
      health: sessionSummary.multiClientChurn
        ? 'MULTI_CLIENT_CHURN'
        : sessionSummary.runtimeSessions > 20
          ? 'STRESSED'
          : 'HEALTHY'
    };

    status.compilerReadiness = buildCompilerReadinessStatus({
      phase2PendingFiles: status.metadata?.phase2PendingFiles ?? 0,
      societiesCount: status.metadata?.societiesCount ?? 0,
      runtimeSessions: sessionSummary.runtimeSessions,
      persistentActive: sessionSummary.totalPersistentActive,
      clientsWithDuplicates: sessionSummary.clientsWithDuplicates
    });
  } catch (error) {
    status.deepVitalsError = error.message;
  }
}

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
