/**
 * Compact status payload helpers.
 * Keeps the MCP status output small without dropping canonical metrics.
 */

function takeSample(items = [], limit = 3) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit);
}

function compactDatabaseHealth(databaseHealth) {
  if (!databaseHealth || typeof databaseHealth !== 'object') return databaseHealth;

  const metrics = databaseHealth.metrics || {};
  return {
    healthy: databaseHealth.healthy,
    healthScore: databaseHealth.healthScore,
    grade: databaseHealth.grade,
    summary: databaseHealth.summary,
    warnings: takeSample(databaseHealth.warnings || [], 2),
    criticalFindings: takeSample(databaseHealth.criticalFindings || [], 2),
    metrics: {
      scannedFiles: metrics.scannedFiles,
      activeFiles: metrics.activeFiles,
      activeAtoms: metrics.activeAtoms,
      orphanAtoms: metrics.orphanAtoms,
      atomsWithCalls: metrics.atomsWithCalls,
      atomsWithCalledBy: metrics.atomsWithCalledBy,
      activeCallRelations: metrics.activeCallRelations,
      activeSharesStateRelations: metrics.activeSharesStateRelations,
      callGraphRows: metrics.callGraphRows,
      orphanCallRelations: metrics.orphanCallRelations,
      activeRiskRows: metrics.activeRiskRows,
      contradictoryRiskRows: metrics.contradictoryRiskRows,
      activeSystemFiles: metrics.activeSystemFiles,
      systemFilesWithSemantics: metrics.systemFilesWithSemantics,
      activeSemanticConnections: metrics.activeSemanticConnections,
      semanticSurface: {
        fileLevelTotal: metrics.semanticSurface?.fileLevel?.total,
        atomLevelTotal: metrics.semanticSurface?.atomLevel?.total,
        derivedFrom: metrics.semanticSurface?.atomLevel?.derivedFrom,
        contract: {
          trustworthy: metrics.semanticSurface?.contract?.trustworthy,
          recommendedSourceOfTruth: metrics.semanticSurface?.contract?.recommendedSourceOfTruth,
          materiallyDrifting: metrics.semanticSurface?.materiallyDrifting
        }
      }
    }
  };
}

function compactCompilerExplainabilitySummary(explainability) {
  if (!explainability || typeof explainability !== 'object') return null;

  return {
    policySummary: explainability.policySummary ? {
      total: explainability.policySummary.total,
      high: explainability.policySummary.high,
      medium: explainability.policySummary.medium,
      low: explainability.policySummary.low
    } : null,
    standardization: explainability.standardization ? {
      canonicalFamilies: explainability.standardization.canonicalFamilies?.length || 0,
      stableCanonicalFamilies: explainability.standardization.stableCanonicalFamilies?.length || 0,
      summary: explainability.standardization.summary || null
    } : null,
    compilerContractLayer: explainability.compilerContractLayer ? {
      summary: {
        healthy: explainability.compilerContractLayer.summary?.healthy,
        failedInvariantCount: explainability.compilerContractLayer.summary?.failedInvariantCount,
        canonicalWrapperFindings: explainability.compilerContractLayer.summary?.canonicalWrapperFindings,
        canonicalBypassFindings: explainability.compilerContractLayer.summary?.canonicalBypassFindings,
        parallelCanonicalSurfaceFindings: explainability.compilerContractLayer.summary?.parallelCanonicalSurfaceFindings,
        dataGatewayContractTrustworthy: explainability.compilerContractLayer.summary?.dataGatewayContractTrustworthy,
        dataGatewayContractState: explainability.compilerContractLayer.summary?.dataGatewayContractState,
        nextAction: explainability.compilerContractLayer.summary?.nextAction
      }
    } : null,
    persistedFileCoverage: explainability.persistedFileCoverage ? {
      total: explainability.persistedFileCoverage.total,
      healthy: explainability.persistedFileCoverage.healthy
    } : null,
    fileImportEvidenceCoverage: explainability.fileImportEvidenceCoverage ? {
      total: explainability.fileImportEvidenceCoverage.total,
      healthy: explainability.fileImportEvidenceCoverage.healthy
    } : null,
    systemMapPersistenceCoverage: explainability.systemMapPersistenceCoverage ? {
      total: explainability.systemMapPersistenceCoverage.total,
      healthy: explainability.systemMapPersistenceCoverage.healthy
    } : null,
    metadataSurfaceParity: explainability.metadataSurfaceParity ? {
      total: explainability.metadataSurfaceParity.total,
      healthy: explainability.metadataSurfaceParity.healthy
    } : null,
    semanticCanonicality: explainability.semanticCanonicality ? {
      total: explainability.semanticCanonicality.total,
      healthy: explainability.semanticCanonicality.healthy
    } : null,
    semanticSurfaceGranularity: explainability.semanticSurfaceGranularity ? {
      total: explainability.semanticSurfaceGranularity.total,
      healthy: explainability.semanticSurfaceGranularity.healthy
    } : null,
    fileUniverseGranularity: explainability.fileUniverseGranularity ? {
      total: explainability.fileUniverseGranularity.total,
      healthy: explainability.fileUniverseGranularity.healthy
    } : null,
    analysisGeneration: explainability.analysisGeneration ? {
      generationId: explainability.analysisGeneration.generationId,
      status: explainability.analysisGeneration.status,
      healthy: explainability.analysisGeneration.healthy,
      recommendation: explainability.analysisGeneration.recommendation
    } : null,
    dataGatewayContract: explainability.dataGatewayContract ? {
      sourceOfTruth: explainability.dataGatewayContract.contract?.recommendedSourceOfTruth,
      generation: explainability.dataGatewayContract.generation ? {
        generationId: explainability.dataGatewayContract.generation.generationId,
        status: explainability.dataGatewayContract.generation.status,
        healthy: explainability.dataGatewayContract.generation.healthy,
        recommendation: explainability.dataGatewayContract.generation.recommendation
      } : null,
      total: explainability.dataGatewayContract.summary?.total,
      fresh: explainability.dataGatewayContract.summary?.fresh,
      stale: explainability.dataGatewayContract.summary?.stale,
      missing: explainability.dataGatewayContract.summary?.missing,
      blocked: explainability.dataGatewayContract.summary?.blocked,
      trustworthy: explainability.dataGatewayContract.summary?.trustworthy,
      nextAction: explainability.dataGatewayContract.summary?.nextAction,
      primaryIssue: explainability.dataGatewayContract.summary?.primaryIssue
    } : null,
    databaseHealth: compactDatabaseHealth(explainability.databaseHealth)
  };
}

function summarizeNodeVitals(nodeVitals) {
  if (!nodeVitals || typeof nodeVitals !== 'object') return null;
  return {
    platform: nodeVitals.platform,
    nodeVersion: nodeVitals.nodeVersion,
    memory: nodeVitals.memory ? {
      rss: nodeVitals.memory.rss,
      heapUsed: nodeVitals.memory.heapUsed,
      heapTotal: nodeVitals.memory.heapTotal
    } : null,
    cpu: nodeVitals.cpu || null
  };
}

function summarizeStatus(status, recentErrors) {
  return {
    initialized: status.initialized,
    initializing: status.initializing,
    project: status.project,
    hotReloadTest: status.hotReloadTest,
    timestamp: status.timestamp,
    telemetryMode: status.telemetryMode,
    summary: {
      total: recentErrors?.summary?.total || 0,
      warnings: recentErrors?.summary?.warnings || 0,
      errors: recentErrors?.summary?.errors || 0
    },
    recentErrors,
    databaseHealth: compactDatabaseHealth(status.databaseHealth),
    metadata: status.metadata ? {
      totalFiles: status.metadata.totalFiles,
      totalFunctions: status.metadata.totalFunctions,
      lastAnalyzed: status.metadata.lastAnalyzed,
      liveAtomCount: status.metadata.liveAtomCount,
      liveFileCount: status.metadata.liveFileCount,
      phase2PendingFiles: status.metadata.phase2PendingFiles,
      phase2CompletedFiles: status.metadata.phase2CompletedFiles,
      societiesCount: status.metadata.societiesCount
    } : null,
    cache: status.cache ? {
      atoms: status.cache.atoms,
      files: status.cache.files,
      relations: status.cache.relations,
      status: status.cache.status
    } : null,
    nodeVitals: summarizeNodeVitals(status.nodeVitals),
    sharedState: status.sharedState ? {
      activeSocietiesBadge: status.sharedState.activeSocietiesBadge,
      actorCount: status.sharedState.actorCount,
      totalLinks: status.sharedState.totalLinks,
      maxContention: status.sharedState.maxContention,
      hottestKey: status.sharedState.hottestKey,
      topContentionKeys: takeSample(status.sharedState.topContentionKeys, 3)
    } : null,
    background: status.background ? {
      phase2PendingFiles: status.background.phase2PendingFiles,
      phase2CompletedFiles: status.background.phase2CompletedFiles,
      societiesCount: status.background.societiesCount,
      graphCoverage: status.background.graphCoverage ? {
        filesTotal: status.background.graphCoverage.filesTotal,
        dependenciesTotal: status.background.graphCoverage.dependenciesTotal,
        coverageRatio: status.background.graphCoverage.coverageRatio,
        callGraphLinks: status.background.graphCoverage.callGraphLinks
      } : null,
      fileUniverseSummary: status.background.fileUniverseSummary ? {
        scannedFileTotal: status.background.fileUniverseSummary.scannedFileTotal,
        liveFileCount: status.background.fileUniverseSummary.liveFileCount,
        zeroAtomFileCount: status.background.fileUniverseSummary.zeroAtomFileCount,
        liveCoverageRatio: status.background.fileUniverseSummary.liveCoverageRatio
      } : null,
      conceptualDuplicates: status.background.conceptualDuplicates ? {
        actionableGroups: status.background.conceptualDuplicates.actionableGroups,
        rawGroups: status.background.conceptualDuplicates.rawGroups,
        actionableRatio: status.background.conceptualDuplicates.actionableRatio
      } : null,
      issueSummary: status.background.issueSummary || null,
      mcpSessionSummary: status.background.mcpSessionSummary || null
    } : null,
    mcpSessions: status.mcpSessions || null,
    compilerReadiness: status.compilerReadiness ? {
      ready: status.compilerReadiness.ready,
      health: status.compilerReadiness.health,
      warnings: takeSample(status.compilerReadiness.warnings || [], 3)
    } : null,
    runtime: status.hotReload ? {
      runtimeRestartMode: status.hotReload.runtimeRestartMode,
      runtimeCodeFresh: status.hotReload.runtimeCodeFresh,
      restartRequired: status.hotReload.restartRequired
    } : null,
    telemetryProvenance: status.telemetryProvenance || null,
    compilerExplainability: compactCompilerExplainabilitySummary(status.compilerExplainability),
    signalConfidence: status.signalConfidence || null,
    warnings: takeSample(status.warnings || [], 3),
    criticalIssues: takeSample(status.criticalIssues || [], 3)
  };
}

export {
  compactDatabaseHealth,
  compactCompilerExplainabilitySummary,
  summarizeNodeVitals,
  summarizeStatus,
  takeSample
};
