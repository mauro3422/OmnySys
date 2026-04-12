/**
 * @fileoverview Current compiler metrics construction helpers.
 *
 * This module isolates the heavy current-snapshot assembly and behavior
 * scoring logic from the canonical snapshot orchestrator.
 *
 * The main build logic is delegated to:
 * - `summaries.js`: Aggregates raw data from DB and compiler explainability
 * - `current-builder.js`: Assembles the final current snapshot object
 * - `helpers.js`: Behavior scoring and row summarization
 *
 * @module shared/compiler/compiler-metrics-current
 */

import { buildCurrentSummaries } from './summaries.js';
import { buildMetricAlignmentSignal } from '../metric-alignment-summary.js';
import { buildPropagationLedger } from '../propagation-ledger.js';
import { summarizeSemanticGranularity } from '../semantic-granularity-api.js';
import { buildCurrentSnapshotObject } from './current-builder.js';

export {
  buildBehaviorScore,
  summarizeCurrentSnapshotRow,
  summarizeHistoryRow
} from './helpers.js';

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
  mcpSessionSummary = null,
  mcpRequestDeliverySummary = null
} = {}) {
  const db = repo?.db || null;

  // Step 1: Build raw summaries from DB and compiler explainability
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
    mcpSessionSummary,
    proxyRuntimeTelemetry,
    bridgeRuntimeTelemetry
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
    requestDeliveryTelemetry,
    topologyTelemetry,
    behavior
  } = summaries;

  // Step 2: Build canonical signals
  const semanticGranularityComparison = compilerExplainability?.semanticGranularityComparison || null;
  const semanticGranularitySummary = summarizeSemanticGranularity(semanticGranularityComparison);

  const requestDeliverySummary = mcpRequestDeliverySummary || requestDeliveryTelemetry || null;
  const topologySummary = topologyTelemetry || null;

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

  // Step 3: Assemble final snapshot object
  return buildCurrentSnapshotObject({
    projectPath,
    scopePath,
    focusPath,
    captureSource,
    snapshotKind,
    summaries,
    compilerExplainability,
    systemInventory,
    canonicalPromotion,
    startupTelemetry,
    proxyRuntimeTelemetry,
    bridgeRuntimeTelemetry,
    watcherAlerts,
    recentErrors,
    issueSummary,
    conceptualSummary,
    pipelineOrphans,
    folderization,
    fileUniverse,
    graphCoverage,
    controlPlaneFoundations,
    databaseHealth,
    metricAlignment,
    propagationLedger,
    semanticGranularityComparison,
    semanticGranularitySummary,
    behavior,
    notificationCounts,
    pendingFiles,
    pipelineTimingTelemetry,
    toolTelemetry,
    mcpSessionSummary,
    requestDeliverySummary,
    topologySummary,
    analysisGeneration
  });
}
