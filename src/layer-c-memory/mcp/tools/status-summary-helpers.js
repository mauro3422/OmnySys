/**
 * Shared compacting helpers for MCP status summaries.
 */

import {
  normalizeCount,
  summarizeSurfaceAuditForStatus,
  summarizeCompilerDriftAssessment,
  summarizeCompilerMetricsSnapshot,
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel
} from '../../../shared/compiler/index.js';
import { compactWatcherSummary } from './status-watcher-summary.js';

export function takeSample(items = [], limit = 3) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit);
}

export function compactDatabaseHealth(databaseHealth) {
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

export function compactRepositoryDiagnostics(repositoryDiagnostics) {
  if (!repositoryDiagnostics || typeof repositoryDiagnostics !== 'object') return null;

  const status = repositoryDiagnostics.status || {};
  const journal = repositoryDiagnostics.journal || {};

  return {
    health: repositoryDiagnostics.health,
    projectPath: status.projectPath || null,
    ready: !!status.ready,
    initialized: !!status.initialized,
    dbOpen: !!status.dbOpen,
    reason: status.reason || null,
    queuedDurable: normalizeCount(repositoryDiagnostics.queuedDurable),
    issues: takeSample(repositoryDiagnostics.issues || [], 3),
    recommendations: takeSample(repositoryDiagnostics.recommendations || [], 3),
    journal: {
      queued: normalizeCount(journal.queued),
      entries: takeSample(journal.entries || [], 3)
    }
  };
}

export function compactCompilerExplainabilitySummary(explainability) {
  if (!explainability || typeof explainability !== 'object') return null;
  const driftAssessment = explainability.driftAssessment
    ? summarizeCompilerDriftAssessment(explainability.driftAssessment)
    : null;

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
    metadataExtractionCoverage: explainability.metadataExtractionCoverage ? {
      totalTables: explainability.metadataExtractionCoverage.summary?.totalTables,
      totalRows: explainability.metadataExtractionCoverage.summary?.totalRows,
      totalFields: explainability.metadataExtractionCoverage.summary?.totalFields,
      coveredFields: explainability.metadataExtractionCoverage.summary?.coveredFields,
      coveragePct: explainability.metadataExtractionCoverage.summary?.coveragePct,
      fieldCoveragePct: explainability.metadataExtractionCoverage.summary?.fieldCoveragePct,
      healthy: explainability.metadataExtractionCoverage.healthy,
      trustworthy: explainability.metadataExtractionCoverage.trustworthy,
      nextAction: explainability.metadataExtractionCoverage.summary?.nextAction,
      primaryIssue: explainability.metadataExtractionCoverage.primaryIssue,
      topMissingFields: takeSample(explainability.metadataExtractionCoverage.topMissingFields, 3),
      topCoveredFields: takeSample(explainability.metadataExtractionCoverage.topCoveredFields, 3)
    } : null,
    surfaceAudit: explainability.surfaceAudit ? summarizeSurfaceAuditForStatus(explainability.surfaceAudit) : null,
    semanticCanonicality: explainability.semanticCanonicality ? {
      total: explainability.semanticCanonicality.total,
      healthy: explainability.semanticCanonicality.healthy
    } : null,
    semanticSurfaceGranularity: explainability.semanticSurfaceGranularity ? {
      total: explainability.semanticSurfaceGranularity.total,
      healthy: explainability.semanticSurfaceGranularity.healthy
    } : null,
    driftAssessment,
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
    watcher: compactWatcherSummary(explainability.watcherStats),
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
    folderization: explainability.folderization ? {
      candidateReport: explainability.folderization.candidateReport ? {
        candidateCount: explainability.folderization.candidateReport.candidateCount,
        topCandidates: takeSample(explainability.folderization.candidateReport.topCandidates || [], 3)
      } : null,
      familyState: explainability.folderization.familyState ? {
        totalFamilies: explainability.folderization.familyState.totalFamilies,
        stateCounts: explainability.folderization.familyState.stateCounts,
        topFamilies: takeSample(explainability.folderization.familyState.topFamilies || [], 3)
      } : null,
      migrationPlans: explainability.folderization.migrationPlans ? {
        candidateCount: explainability.folderization.migrationPlans.candidateCount,
        focusDecision: explainability.folderization.migrationPlans.focusCandidate?.decision || null
      } : null,
      naming: explainability.folderization.naming ? {
        familyCount: explainability.folderization.naming.familyCount,
        renameTargetCount: explainability.folderization.naming.renameTargetCount,
        topFamilies: takeSample(explainability.folderization.naming.topFamilies || [], 3)
      } : null,
      namingPatterns: explainability.folderization.namingPatterns ? {
        totalFamilies: explainability.folderization.namingPatterns.totalFamilies,
        totalTargets: explainability.folderization.namingPatterns.totalTargets,
        patternCounts: explainability.folderization.namingPatterns.patternCounts,
        topFamilyPatterns: takeSample(explainability.folderization.namingPatterns.topFamilyPatterns || [], 3),
        topRecommendedStems: takeSample(explainability.folderization.namingPatterns.topRecommendedStems || [], 5)
      } : null,
      creationGuidance: explainability.folderization.creationGuidance ? {
        mode: explainability.folderization.creationGuidance.mode,
        scopePath: explainability.folderization.creationGuidance.scopePath || null,
        focusPath: explainability.folderization.creationGuidance.focusPath || null,
        matchedBy: explainability.folderization.creationGuidance.matchedBy || 'global',
        familyDomain: explainability.folderization.creationGuidance.familyDomain || null,
        barrelPolicy: explainability.folderization.creationGuidance.barrelPolicy || null,
        helperPolicy: explainability.folderization.creationGuidance.helperPolicy || null,
        collisionPolicy: explainability.folderization.creationGuidance.collisionPolicy || null,
        selectionReason: explainability.folderization.creationGuidance.selectionReason || null,
        preferredFolder: explainability.folderization.creationGuidance.preferredFolder,
        preferredFamilyRoot: explainability.folderization.creationGuidance.preferredFamilyRoot,
        preferredDirectory: explainability.folderization.creationGuidance.preferredDirectory,
        preferredRoleStems: takeSample(explainability.folderization.creationGuidance.preferredRoleStems || [], 5),
        familyExamples: takeSample(explainability.folderization.creationGuidance.familyExamples || [], 3),
        guidance: explainability.folderization.creationGuidance.guidance
      } : null,
      namingDebt: explainability.folderization.namingDebt ? {
        familyCount: explainability.folderization.namingDebt.familyCount,
        renameTargetCount: explainability.folderization.namingDebt.renameTargetCount,
        renameTargetDensity: explainability.folderization.namingDebt.renameTargetDensity
      } : null,
      summary: explainability.folderization.summary || null
    } : null,
    databaseHealth: compactDatabaseHealth(explainability.databaseHealth)
  };
}

export function compactCompilerMetricsSnapshotSummary(snapshot) {
  const compact = summarizeCompilerMetricsSnapshot(snapshot);
  if (!compact) return null;

  return {
    projectPath: compact.projectPath,
    scopePath: compact.scopePath,
    focusPath: compact.focusPath,
    snapshotKind: compact.snapshotKind,
    captureSource: compact.captureSource,
    capturedAt: compact.capturedAt,
    current: {
      globalHealthScore: compact.current?.globalHealthScore,
      globalHealthGrade: compact.current?.globalHealthGrade,
      healthScore: compact.current?.healthScore,
      healthGrade: compact.current?.healthGrade,
      reliabilityScore: compact.current?.reliabilityScore,
      reliabilityGrade: compact.current?.reliabilityGrade,
      reliabilityState: compact.current?.reliabilityState,
      issueCount: compact.current?.issueCount,
      structuralGroups: compact.current?.structuralGroups,
      conceptualGroups: compact.current?.conceptualGroups,
      conceptualRawGroups: compact.current?.conceptualRawGroups,
      pipelineOrphans: compact.current?.pipelineOrphans,
      folderizationCandidateCount: compact.current?.folderizationCandidateCount,
      flatFamilies: compact.current?.flatFamilies,
      mixedFamilies: compact.current?.mixedFamilies,
      alreadyFolderizedFamilies: compact.current?.alreadyFolderizedFamilies,
      namingFamilies: compact.current?.namingFamilies,
      namingTargets: compact.current?.namingTargets,
      namingDebt: compact.current?.namingDebt,
      liveCoverageRatio: compact.current?.liveCoverageRatio,
      metadataCoveragePct: compact.current?.metadataCoveragePct,
      metadataFieldCoveragePct: compact.current?.metadataFieldCoveragePct,
      dataGatewayTrustworthy: compact.current?.dataGatewayTrustworthy,
      dataGatewayState: compact.current?.dataGatewayState,
      activeAtoms: compact.current?.activeAtoms,
      zeroAtomFileCount: compact.current?.zeroAtomFileCount,
      callLinks: compact.current?.callLinks,
      semanticLinks: compact.current?.semanticLinks,
      watcherAlertCount: compact.current?.watcherAlertCount,
      recentWarningCount: compact.current?.recentWarningCount,
      recentErrorCount: compact.current?.recentErrorCount,
      phase2PendingFiles: compact.current?.phase2PendingFiles,
      databaseTrustworthy: compact.current?.databaseTrustworthy,
      folderizationDecision: compact.current?.folderizationDecision,
      driftState: compact.current?.driftState,
      driftScore: compact.current?.driftScore,
      stabilityScore: compact.current?.stabilityScore,
      successScore: compact.current?.successScore,
      successThreshold: compact.current?.successThreshold,
      mvpReady: compact.current?.mvpReady,
      behaviorState: compact.current?.behaviorState,
      readinessReason: compact.current?.readinessReason,
      activeAtomsDriftState: compact.current?.activeAtomsDriftState,
      activeAtomsDriftReason: compact.current?.activeAtomsDriftReason,
      clientSyncState: compact.current?.clientSyncState,
      clientSyncSeverity: compact.current?.clientSyncSeverity,
      clientSyncReason: compact.current?.clientSyncReason,
      clientSyncRecommendation: compact.current?.clientSyncRecommendation,
      activeAtomsDelta: compact.current?.activeAtomsDelta,
      activeAtomsDeltaPct: compact.current?.activeAtomsDeltaPct,
      mcpSessionSummary: compact.current?.mcpSessionSummary ? {
        summary: compact.current.mcpSessionSummary.summary || null,
        runtimeSessions: compact.current.mcpSessionSummary.runtimeSessions || null,
        totalPersistent: compact.current.mcpSessionSummary.totalPersistent || null,
        totalPersistentActive: compact.current.mcpSessionSummary.totalPersistentActive || null,
        uniqueClients: compact.current.mcpSessionSummary.uniqueClients || null,
        clientsWithDuplicates: compact.current.mcpSessionSummary.clientsWithDuplicates || null,
        actionableDuplicateClients: compact.current.mcpSessionSummary.actionableDuplicateClients || null,
        toleratedDuplicateClients: compact.current.mcpSessionSummary.toleratedDuplicateClients || null,
        sessionCountDrift: compact.current.mcpSessionSummary.sessionCountDrift || false,
        multiClientChurn: compact.current.mcpSessionSummary.multiClientChurn || false,
        clientSyncHealthy: compact.current.mcpSessionSummary.clientSyncHealthy || false,
        clientSyncTrustworthy: compact.current.mcpSessionSummary.clientSyncTrustworthy || false,
        clientSyncState: compact.current.mcpSessionSummary.clientSyncState || null,
        clientSyncSeverity: compact.current.mcpSessionSummary.clientSyncSeverity || null,
        clientSyncReason: compact.current.mcpSessionSummary.clientSyncReason || null,
        clientSyncRecommendation: compact.current.mcpSessionSummary.clientSyncRecommendation || null,
        clientSyncSummary: compact.current.mcpSessionSummary.clientSyncSummary || null
      } : null,
      pipelineTimingTelemetry: compact.current?.pipelineTimingTelemetry ? {
        projectPath: compact.current.pipelineTimingTelemetry.projectPath,
        runKind: compact.current.pipelineTimingTelemetry.runKind,
        status: compact.current.pipelineTimingTelemetry.status,
        performanceState: compact.current.pipelineTimingTelemetry.performanceState,
        performanceScore: compact.current.pipelineTimingTelemetry.performanceScore,
        capturedAt: compact.current.pipelineTimingTelemetry.capturedAt,
        current: compact.current.pipelineTimingTelemetry.current,
        trend: compact.current.pipelineTimingTelemetry.trend,
        history: compact.current.pipelineTimingTelemetry.history,
        summary: compact.current.pipelineTimingTelemetry.summary,
        oneLine: compact.current.pipelineTimingTelemetry.oneLine
      } : null,
      toolTelemetry: compact.current?.toolTelemetry ? {
        totalRuns: compact.current.toolTelemetry.totalRuns,
        successfulRuns: compact.current.toolTelemetry.successfulRuns,
        repairedRuns: compact.current.toolTelemetry.repairedRuns,
        thrashingRuns: compact.current.toolTelemetry.thrashingRuns,
        comparableRuns: compact.current.toolTelemetry.comparableRuns,
        observationRuns: compact.current.toolTelemetry.observationRuns,
        pressureRuns: compact.current.toolTelemetry.pressureRuns,
        clearanceRuns: compact.current.toolTelemetry.clearanceRuns,
        repairYield: compact.current.toolTelemetry.repairYield,
        repairRateOnPressure: compact.current.toolTelemetry.repairRateOnPressure,
        observationRate: compact.current.toolTelemetry.observationRate,
        toolSuccessRate: compact.current.toolTelemetry.toolSuccessRate,
        alertClearanceRate: compact.current.toolTelemetry.alertClearanceRate,
        errorClearanceRate: compact.current.toolTelemetry.errorClearanceRate,
        averageDurationMs: compact.current.toolTelemetry.averageDurationMs,
        averageRepairScore: compact.current.toolTelemetry.averageRepairScore,
        lastRunAt: compact.current.toolTelemetry.lastRunAt,
        lastSuccessfulRunAt: compact.current.toolTelemetry.lastSuccessfulRunAt,
        topTools: compact.current.toolTelemetry.topTools
      } : null
    },
    trend: {
      status: compact.trend?.status,
      summary: compact.trend?.summary,
      progressScore: compact.trend?.progressScore,
      velocityPerDay: compact.trend?.velocityPerDay,
      improvingStreak: compact.trend?.improvingStreak,
      behaviorTrend: compact.trend?.behaviorTrend,
      daysSinceBaseline: compact.trend?.daysSinceBaseline,
      daysSincePrevious: compact.trend?.daysSincePrevious
    },
    history: {
      total: compact.history?.total,
      latestCapturedAt: compact.history?.latestCapturedAt,
      previousCapturedAt: compact.history?.previousCapturedAt,
      baselineCapturedAt: compact.history?.baselineCapturedAt
    },
    metricDictionary: compact.metricDictionary,
    summary: compact.summary
  };
}

export function compactCompilerHealthDashboardSummary(dashboard) {
  const compact = summarizeCompilerHealthDashboard(dashboard);
  if (!compact) return null;

  return {
    projectPath: compact.projectPath,
    scopePath: compact.scopePath,
    focusPath: compact.focusPath,
    snapshotKind: compact.snapshotKind,
    captureSource: compact.captureSource,
    capturedAt: compact.capturedAt,
    status: compact.status,
    health: compact.health,
    trend: compact.trend,
    performance: compact.performance,
    metrics: compact.metrics,
    sessions: compact.sessions ? {
      summary: compact.sessions.summary || null,
      clientSyncState: compact.sessions.clientSyncState || null,
      clientSyncReason: compact.sessions.clientSyncReason || null,
      clientSyncRecommendation: compact.sessions.clientSyncRecommendation || null,
      clientSyncSummary: compact.sessions.clientSyncSummary || null
    } : null,
    toolTelemetry: compact.toolTelemetry,
    metricDictionary: compact.metricDictionary || null,
    regressors: takeSample(compact.regressors || [], 5),
    improvements: takeSample(compact.improvements || [], 5),
    recommendations: takeSample(compact.recommendations || [], 5),
    watcherAlerts: takeSample(compact.watcherAlerts || [], 5),
    recentErrors: compact.recentErrors ? {
      total: compact.recentErrors.total,
      warnings: compact.recentErrors.warnings,
      errors: compact.recentErrors.errors,
      logs: takeSample(compact.recentErrors.logs || [], 3)
    } : null,
    history: compact.history,
    summary: compact.summary
  };
}

export function compactCompilerHealthPanelSummary(panel) {
  const compact = summarizeCompilerHealthPanel(panel);
  if (!compact) return null;

  return {
    projectPath: compact.projectPath,
    scopePath: compact.scopePath,
    focusPath: compact.focusPath,
    snapshotKind: compact.snapshotKind,
    captureSource: compact.captureSource,
    capturedAt: compact.capturedAt,
    status: compact.status,
    headline: compact.headline,
    now: compact.now,
    trend: compact.trend,
    performance: compact.performance,
    tools: compact.tools,
    metricDictionary: compact.metricDictionary || null,
    topRegressors: takeSample(compact.topRegressors || [], 3),
    topImprovements: takeSample(compact.topImprovements || [], 3),
    topRecommendations: takeSample(compact.topRecommendations || [], 3),
    nextAction: compact.nextAction,
    summary: compact.summary,
    oneLine: compact.oneLine
  };
}

export function summarizeNodeVitals(nodeVitals) {
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
