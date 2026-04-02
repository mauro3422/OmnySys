/**
 * Compact compiler metrics snapshot summary for MCP status.
 */

import { summarizeCompilerMetricsSnapshot } from '../../../shared/compiler/index.js';

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
      behaviorGateSummary: compact.current?.behaviorGateSummary ? {
        blockerCount: compact.current.behaviorGateSummary.blockerCount || 0,
        watchCount: compact.current.behaviorGateSummary.watchCount || 0,
        primaryBlocker: compact.current.behaviorGateSummary.primaryBlocker || null,
        primaryWatchSignal: compact.current.behaviorGateSummary.primaryWatchSignal || null,
        blockedBy: Array.isArray(compact.current.behaviorGateSummary.blockedBy) ? compact.current.behaviorGateSummary.blockedBy.slice(0, 3) : [],
        watchSignals: Array.isArray(compact.current.behaviorGateSummary.watchSignals) ? compact.current.behaviorGateSummary.watchSignals.slice(0, 3) : []
      } : null,
      behaviorBlockers: Array.isArray(compact.current?.behaviorBlockers) ? compact.current.behaviorBlockers.slice(0, 3) : [],
      behaviorWatchSignals: Array.isArray(compact.current?.behaviorWatchSignals) ? compact.current.behaviorWatchSignals.slice(0, 3) : [],
      primaryBehaviorBlocker: compact.current?.primaryBehaviorBlocker || null,
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

export default {
  compactCompilerMetricsSnapshotSummary
};
