import {
  buildCompilerReadinessStatus,
  getConceptualDuplicateSummary,
  getGraphCoverageSummary,
  getIssueSummary,
  getMcpSessionSummary,
  getPhase2FileCounts,
  getSharedStateContentionSummary,
  loadCompilerDiagnosticsSnapshot,
  summarizePropagationPlan
} from '../../../shared/compiler/index.js';

void summarizePropagationPlan;

function buildSharedStateStatus(sharedStateSummary) {
  return {
    activeSocietiesBadge: sharedStateSummary.actorCount > 0 ? 'RADIOACTIVE' : 'CLEAN',
    actorCount: sharedStateSummary.actorCount,
    totalLinks: sharedStateSummary.totalLinks,
    maxContention: sharedStateSummary.maxContention,
    hottestKey: sharedStateSummary.hottestKey,
    topContentionKeys: sharedStateSummary.topContentionKeys
  };
}

function buildBackgroundStatus({
  repo,
  phase2Counts,
  graphCoverage,
  issueSummary,
  fileUniverseSummary,
  liveRowSync,
  conceptualSummary,
  sessionSummary
}) {
  return {
    phase2PendingFiles: phase2Counts.pendingFiles,
    phase2CompletedFiles: phase2Counts.completedFiles,
    societiesCount: repo.db.prepare('SELECT COUNT(*) as n FROM societies').get()?.n || 0,
    graphCoverage,
    fileUniverseSummary: {
      scannedFileTotal: fileUniverseSummary.scannedFileTotal,
      liveFileCount: fileUniverseSummary.liveFileCount,
      zeroAtomFileCount: fileUniverseSummary.zeroAtomFileCount,
      liveCoverageRatio: fileUniverseSummary.liveCoverageRatio,
      liveRowSync: liveRowSync?.summary || null
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
}

function buildMcpSessionsStatus(sessionSummary) {
  return {
    totalActive: sessionSummary.runtimeSessions,
    totalPersistent: sessionSummary.totalPersistent,
    totalPersistentActive: sessionSummary.totalPersistentActive,
    uniqueClients: sessionSummary.uniqueClients,
    clientsWithDuplicates: sessionSummary.clientsWithDuplicates,
    actionableDuplicateClients: sessionSummary.actionableDuplicateClients,
    toleratedDuplicateClients: sessionSummary.toleratedDuplicateClients,
    clientSyncState: sessionSummary.clientSyncState || null,
    clientSyncSeverity: sessionSummary.clientSyncSeverity || null,
    clientSyncReason: sessionSummary.clientSyncReason || null,
    clientSyncRecommendation: sessionSummary.clientSyncRecommendation || null,
    transportOriginCounts: sessionSummary.transportOriginCounts || null,
    transportOriginTotal: sessionSummary.transportOriginTotal || 0,
    transportOriginDistinctCount: sessionSummary.transportOriginDistinctCount || 0,
    transportOriginKnownCount: sessionSummary.transportOriginKnownCount || 0,
    dominantTransportOrigin: sessionSummary.dominantTransportOrigin || null,
    dominantTransportOriginCount: sessionSummary.dominantTransportOriginCount || 0,
    transportOriginMix: Array.isArray(sessionSummary.transportOriginMix) ? sessionSummary.transportOriginMix.slice(0, 8) : [],
    transportProvenanceState: sessionSummary.transportProvenanceState || null,
    transportProvenanceHealthy: sessionSummary.transportProvenanceHealthy === true,
    transportProvenanceTrustworthy: sessionSummary.transportProvenanceTrustworthy !== false,
    transportProvenanceReason: sessionSummary.transportProvenanceReason || null,
    transportProvenanceRecommendation: sessionSummary.transportProvenanceRecommendation || null,
    transportProvenanceSummary: sessionSummary.transportProvenanceSummary || null,
    health: sessionSummary.multiClientChurn
      ? 'MULTI_CLIENT_CHURN'
      : sessionSummary.runtimeSessions > 20
        ? 'STRESSED'
        : 'HEALTHY'
  };
}

export async function attachDeepVitals(status, projectPath, server) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const { sessionManager } = await import('../core/manager.js');
    const repo = getRepository(projectPath);
    if (!repo?.db) {
      return;
    }

    const sharedStateSummary = getSharedStateContentionSummary(repo.db);
    const compilerDiagnostics = await loadCompilerDiagnosticsSnapshot({
      projectPath,
      db: repo.db,
      sharedState: sharedStateSummary
    });
    status.sharedState = buildSharedStateStatus(sharedStateSummary);

    const phase2Counts = getPhase2FileCounts(repo.db);
    const graphCoverage = getGraphCoverageSummary(repo.db);
    const issueSummary = getIssueSummary(repo.db);
    const controlPlaneFoundations = compilerDiagnostics.controlPlaneFoundations || {};
    const liveRowSync = controlPlaneFoundations.liveRowSync
      || compilerDiagnostics.databaseHealth?.metrics?.liveRowSync
      || null;
    const fileUniverseSummary = controlPlaneFoundations.fileUniverseGranularity
      || compilerDiagnostics.fileUniverseGranularity
      || {};
    const conceptualSummary = getConceptualDuplicateSummary(repo, { limit: 50 });
    const sessionSummary = getMcpSessionSummary(sessionManager, {
      runtimeSessionCount: server.sessions?.size || 0,
      sessionDb: repo?.db || null
    });

    status.background = buildBackgroundStatus({
      repo,
      phase2Counts,
      graphCoverage,
      issueSummary,
      fileUniverseSummary,
      liveRowSync,
      conceptualSummary,
      sessionSummary
    });

    status.mcpSessions = buildMcpSessionsStatus(sessionSummary);
    status.compilerReadiness = buildCompilerReadinessStatus({
      phase2PendingFiles: status.metadata?.phase2PendingFiles ?? 0,
      societiesCount: status.metadata?.societiesCount ?? 0,
      runtimeSessions: sessionSummary.runtimeSessions,
      persistentActive: sessionSummary.totalPersistentActive,
      clientsWithDuplicates: sessionSummary.clientsWithDuplicates,
      actionableDuplicateClients: sessionSummary.actionableDuplicateClients,
      toleratedDuplicateClients: sessionSummary.toleratedDuplicateClients,
      sessionCountDrift: sessionSummary.sessionCountDrift,
      clientSyncState: sessionSummary.clientSyncState,
      clientSyncReason: sessionSummary.clientSyncReason
    });
  } catch (error) {
    status.deepVitalsError = error.message;
  }
}
