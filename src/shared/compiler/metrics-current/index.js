/**
 * @fileoverview Current compiler metrics construction helpers.
 *
 * This module isolates the heavy current-snapshot assembly and behavior
 * scoring logic from the canonical snapshot orchestrator.
 *
 * @module shared/compiler/compiler-metrics-current
 */

import { normalizeFolderizationPath } from '../directory-structure-folderization-data.js';
import {
  buildBehaviorScore,
  summarizeCurrentSnapshotRow,
  summarizeHistoryRow
} from './helpers.js';
import { buildCurrentSummaries } from './summaries.js';
import { asNumber } from '../core-utils.js';
import { buildStartupRegressionSummary } from '../startup-regression-summary.js';
import { normalizeSnapshotPath } from '#shared/compiler/snapshot-path.js';
import { buildMetricAlignmentSignal } from '../metric-alignment-summary.js';
import { buildPropagationLedger } from '../propagation-ledger.js';

function compactFolderizationPropagation(propagation = null) {
  if (!propagation) {
    return null;
  }

  return {
    changeType: propagation.changeType || 'folderization',
    cacheKey: propagation.cacheKey || null,
    cacheHit: Boolean(propagation.cacheHit),
    decision: propagation.decision || null,
    mode: propagation.mode || null,
    impactedFileCount: asNumber(propagation.impactedFileCount, 0),
    rewriteCount: asNumber(propagation.rewriteCount, 0),
    renameTargetCount: asNumber(propagation.renameTargetCount, 0),
    validationTargetCount: asNumber(propagation.validationTargetCount, 0),
    hasCrossFamilyPropagation: Boolean(propagation.hasCrossFamilyPropagation),
    connectedSystems: Array.isArray(propagation.connectedSystems) ? propagation.connectedSystems.slice(0, 8) : [],
    recommendationStrategy: propagation.recommendationStrategy || null,
    scopePath: propagation.scopePath || null,
    focusPath: propagation.focusPath || null
  };
}

function compactFolderizationNormalization(normalization = null) {
  if (!normalization) {
    return null;
  }

  const summary = normalization.summary || normalization;
  return {
    mode: normalization.mode || 'plan',
    candidatePath: normalization.candidatePath || null,
    familyRoot: summary.familyRoot || null,
    directory: summary.directory || null,
    familyCount: asNumber(summary.familyCount, 0),
    renameTargetCount: asNumber(summary.renameTargetCount, 0),
    renameTargetDensity: asNumber(summary.renameTargetDensity, 0),
    safetyLevel: summary.safetyLevel || normalization.analysis?.safety?.level || 'none',
    recommendedAction: summary.recommendedAction || normalization.analysis?.recommendation?.action || 'noop',
    candidatePaths: Array.isArray(normalization.candidatePaths) ? normalization.candidatePaths.slice(0, 8) : []
  };
}

export function buildCurrentMetrics({
  projectPath,
  scopePath,
  focusPath,
  captureSource,
  snapshotKind = 'status',
  compilerExplainability = null,
  systemInventory = null,
  canonicalPromotion = null,
  startupTelemetry = null,
  proxyRuntimeTelemetry = null,
  bridgeRuntimeTelemetry = null,
  repo = null,
  watcherAlerts = [],
  recentErrors = null,
  driftAssessment = null,
  toolRunTelemetryWindowDays = 7,
  phase2PendingFiles = null,
  mcpSessionSummary = null
} = {}) {
  const db = repo?.db || null;
  const summaries = buildCurrentSummaries({
    db,
    repo,
    compilerExplainability,
    driftAssessment,
    projectPath,
    scopePath,
    focusPath,
    watcherAlerts,
    recentErrors,
    phase2PendingFiles,
    toolRunTelemetryWindowDays,
    mcpSessionSummary
  });
  const {
    graphCoverage,
    issueSummary,
    conceptualSummary,
    pipelineOrphans,
    folderization,
    databaseHealth,
    fileUniverse,
    analysisGeneration,
    controlPlaneFoundations,
    compilerDriftAssessment,
    notificationCounts,
    pendingFiles,
    pipelineTimingTelemetry,
    toolTelemetry,
    behavior
  } = summaries;
  const dataGatewayContract = controlPlaneFoundations?.dataGatewayContract || compilerExplainability?.dataGatewayContract || null;
  const liveRowSync = controlPlaneFoundations?.liveRowSync || databaseHealth?.metrics?.liveRowSync || null;
  const metricAlignment = buildMetricAlignmentSignal({
    compilerExplainability,
    systemInventory,
    current: null,
    bridgeCallReliability: bridgeRuntimeTelemetry?.bridgeCallReliability || null
  });
  const propagationLedger = buildPropagationLedger({
    compilerExplainability,
    systemInventory,
    metricAlignment,
    source: captureSource || 'status.runtime',
    watcherAlerts,
    sharedState: null
  });
  const watcherIssuePersistence = issueSummary?.watcherIssuePersistence || null;
  const issuePersistence = watcherIssuePersistence ? {
    activeIssueCount: asNumber(watcherIssuePersistence.activeIssueCount, 0),
    recentIssueCount: asNumber(watcherIssuePersistence.recentIssueCount, 0),
    withoutLifecycle: asNumber(watcherIssuePersistence.withoutLifecycle, 0),
    withoutContext: asNumber(watcherIssuePersistence.withoutContext, 0),
    orphanedIssues: asNumber(watcherIssuePersistence.orphanedIssues, 0),
    pipelineOrphanCount: asNumber(issueSummary?.pipelineOrphanCount || issueSummary?.orphanCount, 0),
    lifecycleDistribution: watcherIssuePersistence.lifecycleDistribution || null
  } : null;

  const current = {
    projectPath,
    scopePath: normalizeSnapshotPath(scopePath),
    focusPath: normalizeSnapshotPath(focusPath),
    captureSource: captureSource || 'status.runtime',
    capturedAt: new Date().toISOString(),
    analysisGenerationId: analysisGeneration?.generationId || null,
    healthScore: asNumber(databaseHealth?.healthScore, 0),
    healthGrade: databaseHealth?.grade || 'F',
    issueCount: asNumber(issueSummary.total, 0),
    watcherIssuePersistence: issuePersistence,
    structuralGroups: asNumber(summaries.structuralGroups, 0),
    conceptualGroups: asNumber(conceptualSummary.actionableGroups, 0),
    conceptualRawGroups: asNumber(conceptualSummary.rawGroups, 0),
    conceptualImplementations: asNumber(conceptualSummary.actionableImplementations, 0),
    pipelineOrphans: asNumber(pipelineOrphans.orphanCount, 0),
    folderizationCandidateCount: asNumber(folderization?.candidateReport?.candidateCount, 0),
    flatFamilies: asNumber(folderization?.familyState?.stateCounts?.flat, 0),
    mixedFamilies: asNumber(folderization?.familyState?.stateCounts?.mixed, 0),
    alreadyFolderizedFamilies: asNumber(folderization?.familyState?.stateCounts?.already_folderized, 0),
    namingFamilies: asNumber(folderization?.naming?.familyCount, 0),
    namingTargets: asNumber(folderization?.naming?.renameTargetCount, 0),
    namingDebt: asNumber(folderization?.namingDebt?.renameTargetCount, 0),
    liveCoverageRatio: asNumber(fileUniverse?.liveCoverageRatio, 0),
    zeroAtomFileCount: asNumber(fileUniverse?.zeroAtomFileCount, 0),
    metadataCoveragePct: asNumber(
      compilerExplainability?.metadataExtractionCoverage?.summary?.fieldCoveragePct
        ?? compilerExplainability?.metadataExtractionCoverage?.summary?.coveragePct
        ?? systemInventory?.metadataCoveragePct
        ?? 0,
      0
    ),
    metadataFieldCoveragePct: asNumber(compilerExplainability?.metadataExtractionCoverage?.summary?.fieldCoveragePct, 0),
    metadataWeightedCoveragePct: asNumber(compilerExplainability?.metadataExtractionCoverage?.summary?.coveragePct, 0),
    dataGatewayTrustworthy: dataGatewayContract?.summary?.trustworthy === true,
    dataGatewayState: dataGatewayContract?.summary?.primaryIssue?.state
      || (dataGatewayContract?.summary?.trustworthy === true ? 'trustworthy' : 'needs_attention'),
    callLinks: asNumber(graphCoverage.callLinks, 0),
    semanticLinks: asNumber(graphCoverage.semanticLinks, 0),
    activeAtoms: asNumber(databaseHealth?.metrics?.activeAtoms, 0),
    liveRowSync,
    watcherAlertCount: Array.isArray(watcherAlerts) ? watcherAlerts.length : 0,
    recentWarningCount: notificationCounts.warnings,
    recentErrorCount: notificationCounts.errors,
    phase2PendingFiles: asNumber(pendingFiles, 0),
    mcpSessionSummary: mcpSessionSummary || null,
    databaseTrustworthy: Boolean(databaseHealth?.healthy),
    clientSyncState: mcpSessionSummary?.clientSyncState || null,
    clientSyncSeverity: mcpSessionSummary?.clientSyncSeverity || null,
    clientSyncReason: mcpSessionSummary?.clientSyncReason || null,
    clientSyncRecommendation: mcpSessionSummary?.clientSyncRecommendation || null,
    clientSyncEvidence: mcpSessionSummary?.clientSyncEvidence || null,
    systemInventory: systemInventory || null,
    canonicalPromotion: canonicalPromotion || null,
    policyCoverage: systemInventory?.policyCoverage || null,
    metricAlignment,
    propagationLedger,
    folderizationAutomation: compilerExplainability?.folderization?.automation || null,
    startupTelemetry: buildStartupRegressionSummary(startupTelemetry),
    proxyRuntimeTelemetry: proxyRuntimeTelemetry || null,
    bridgeRuntimeTelemetry: bridgeRuntimeTelemetry || null,
    folderizationDecision: folderization?.decision || null,
    folderizationNormalization: compactFolderizationNormalization(folderization?.normalization || null),
    folderizationPropagation: compactFolderizationPropagation(folderization?.propagation || null),
    folderizationPropagationAdoption: compilerExplainability?.folderization?.automation?.propagationAdoption || null,
    driftState: behavior.driftState,
    driftScore: behavior.driftScore,
    stabilityScore: behavior.stabilityScore,
    successScore: behavior.successScore,
    successThreshold: behavior.successThreshold,
    mvpReady: behavior.mvpReady,
    behaviorState: behavior.behaviorState,
    readinessReason: behavior.readinessReason,
    behaviorGateSummary: behavior.behaviorGateSummary,
    behaviorBlockers: behavior.blockedBy,
    behaviorWatchSignals: behavior.watchSignals,
    primaryBehaviorBlocker: behavior.primaryBlocker,
    pipelineTimingTelemetry,
    toolTelemetry
  };

  current.summaryText = [
    `health=${current.healthScore}/${current.healthGrade}`,
    `success=${Math.round(current.successScore)}/${current.successThreshold}${current.mvpReady ? ' ready' : ''}`,
    `behavior=${current.behaviorState}`,
    `atoms=${current.activeAtoms}`,
    current.clientSyncState && current.clientSyncState !== 'fresh'
      ? `clientsync=${current.clientSyncState}`
      : null,
    current.pipelineTimingTelemetry?.current?.totalDurationMs
      ? `perf=${current.pipelineTimingTelemetry.performanceState || current.pipelineTimingTelemetry.status || 'unknown'}:${Math.round(current.pipelineTimingTelemetry.current.totalDurationMs)}ms`
      : 'perf=none',
    current.toolTelemetry?.totalRuns > 0
      ? `tools=${current.toolTelemetry.successfulRuns}/${current.toolTelemetry.totalRuns} ok`
      : 'tools=0',
    current.startupTelemetry?.state
      ? `startup=${current.startupTelemetry.state}:${Math.round(current.startupTelemetry.totalDurationMs || 0)}ms`
      : null,
    current.folderizationNormalization?.recommendedAction
      ? `normalize=${current.folderizationNormalization.recommendedAction}:${current.folderizationNormalization.renameTargetCount}`
      : null,
    current.folderizationAutomation?.propagationAdoption?.adoptionState
      ? `adoption=${current.folderizationAutomation.propagationAdoption.adoptionState}:${current.folderizationAutomation.propagationAdoption.missingSystemCount || 0}`
      : null,
    current.proxyRuntimeTelemetry?.state
      ? `proxy=${current.proxyRuntimeTelemetry.state}`
      : null,
    current.bridgeRuntimeTelemetry?.state
      ? `bridge=${current.bridgeRuntimeTelemetry.state}`
      : null,
    current.toolTelemetry?.pressureRuns > 0
      ? `repair=${current.toolTelemetry.repairedRuns}/${current.toolTelemetry.pressureRuns}`
      : null,
    `issues=${current.issueCount}`,
    current.watcherIssuePersistence
      ? `issuePersistence=${current.watcherIssuePersistence.activeIssueCount || 0}:${current.watcherIssuePersistence.orphanedIssues || 0}/${current.watcherIssuePersistence.withoutLifecycle || 0}/${current.watcherIssuePersistence.withoutContext || 0}`
      : null,
    `dups=${current.structuralGroups + current.conceptualGroups}`,
    `folder=${current.alreadyFolderizedFamilies}/${current.flatFamilies + current.mixedFamilies + current.alreadyFolderizedFamilies}`,
    current.canonicalPromotion?.promotionState
      ? `promotion=${current.canonicalPromotion.promotionState}:${current.canonicalPromotion.candidateCount || 0}`
      : null,
    current.policyCoverage?.coverageState
      ? `policy=${current.policyCoverage.coverageState}:${current.policyCoverage.coverageScore || 0}`
      : null,
    current.propagationLedger?.state
      ? `ledger=${current.propagationLedger.state}:${current.propagationLedger.policyDriftCount || 0}`
      : null,
    current.metricAlignment?.state
      ? `alignment=${current.metricAlignment.state}`
      : null,
    current.folderizationPropagation?.decision
      ? `propagation=${current.folderizationPropagation.decision}`
      : null,
    `coverage=${Math.round(current.liveCoverageRatio * 100)}%`
  ].join(' | ');

  return current;
}

export {
  buildBehaviorScore,
  summarizeCurrentSnapshotRow,
  summarizeHistoryRow
};
