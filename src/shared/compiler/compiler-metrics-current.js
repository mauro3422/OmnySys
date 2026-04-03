/**
 * @fileoverview Current compiler metrics construction helpers.
 *
 * This module isolates the heavy current-snapshot assembly and behavior
 * scoring logic from the canonical snapshot orchestrator.
 *
 * @module shared/compiler/compiler-metrics-current
 */

import { normalizeFolderizationPath } from './directory-structure-folderization-data.js';
import {
  buildBehaviorScore,
  summarizeCurrentSnapshotRow,
  summarizeHistoryRow
} from './compiler-metrics-current-helpers.js';
import { buildCurrentSummaries } from './compiler-metrics-current-summaries.js';
import { asNumber } from './core-utils.js';

function normalizeSnapshotPath(value = '') {
  const normalized = normalizeFolderizationPath(value);
  return normalized || null;
}

function clampScore(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

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

export function buildCurrentMetrics({
  projectPath,
  scopePath,
  focusPath,
  captureSource,
  snapshotKind = 'status',
  compilerExplainability = null,
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
    compilerDriftAssessment,
    notificationCounts,
    pendingFiles,
    pipelineTimingTelemetry,
    toolTelemetry,
    behavior
  } = summaries;

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
    metadataCoveragePct: asNumber(compilerExplainability?.metadataExtractionCoverage?.summary?.coveragePct, 0),
    metadataFieldCoveragePct: asNumber(compilerExplainability?.metadataExtractionCoverage?.summary?.fieldCoveragePct, 0),
    dataGatewayTrustworthy: compilerExplainability?.dataGatewayContract?.summary?.trustworthy === true,
    dataGatewayState: compilerExplainability?.dataGatewayContract?.summary?.primaryIssue?.state
      || (compilerExplainability?.dataGatewayContract?.summary?.trustworthy === true ? 'trustworthy' : 'needs_attention'),
    callLinks: asNumber(graphCoverage.callLinks, 0),
    semanticLinks: asNumber(graphCoverage.semanticLinks, 0),
    activeAtoms: asNumber(databaseHealth?.metrics?.activeAtoms, 0),
    liveRowSync: databaseHealth?.metrics?.liveRowSync || null,
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
    folderizationDecision: folderization?.decision || null,
    folderizationPropagation: compactFolderizationPropagation(folderization?.propagation || null),
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
    current.toolTelemetry?.pressureRuns > 0
      ? `repair=${current.toolTelemetry.repairedRuns}/${current.toolTelemetry.pressureRuns}`
      : null,
    `issues=${current.issueCount}`,
    `dups=${current.structuralGroups + current.conceptualGroups}`,
    `folder=${current.alreadyFolderizedFamilies}/${current.flatFamilies + current.mixedFamilies + current.alreadyFolderizedFamilies}`,
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
