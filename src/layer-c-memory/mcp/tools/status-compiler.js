import {
  buildCompilerReadinessStatus,
  getConceptualDuplicateSummary,
  getFileUniverseSummary,
  getGraphCoverageSummary,
  getIssueSummary,
  getMcpSessionSummary,
  getPhase2FileCounts,
  getSharedStateContentionSummary
} from '../../../shared/compiler/index.js';

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
      actionableDuplicateClients: sessionSummary.actionableDuplicateClients,
      toleratedDuplicateClients: sessionSummary.toleratedDuplicateClients,
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
      clientsWithDuplicates: sessionSummary.clientsWithDuplicates,
      actionableDuplicateClients: sessionSummary.actionableDuplicateClients,
      toleratedDuplicateClients: sessionSummary.toleratedDuplicateClients
    });
  } catch (error) {
    status.deepVitalsError = error.message;
  }
}
