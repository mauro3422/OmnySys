/**
 * @fileoverview Current metric aggregation helpers.
 */

import { buildBehaviorScore, buildStructuralDuplicateGroups } from './helpers.js';
import { getGraphCoverageSummary, getIssueSummary, getConceptualDuplicateSummary } from '../compiler-runtime-metrics/summary.js';
import { getPhase2PendingFiles } from '../compiler-runtime-metrics-db.js';
import { getPipelineOrphanSummary } from '../pipeline-orphans.js';
import { buildPipelineTimingTelemetrySummary } from '../pipeline-timing-telemetry/telemetry.js';
import { buildToolRunTelemetrySummary } from '../tool-run-telemetry/telemetry.js';
import { buildMcpRequestDeliverySummary } from '../mcp-request-delivery-telemetry.js';
import { buildMcpTopologySummary } from '../mcp-topology-telemetry.js';
import { asNumber } from '../core-utils.js';
import { normalizeSnapshotPath } from '#shared/compiler/snapshot-path.js';

export function buildCurrentSummaries({
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
}) {
  const graphCoverage = (() => {
    try {
      return db ? getGraphCoverageSummary(db) : { callLinks: 0, semanticLinks: 0 };
    } catch {
      return { callLinks: 0, semanticLinks: 0 };
    }
  })();
  const issueSummary = (() => {
    try {
      return db ? getIssueSummary(db, { minDeadCodeLines: 5 }) : { total: 0 };
    } catch {
      return { total: 0 };
    }
  })();
  const conceptualSummary = (() => {
    try {
      return repo ? getConceptualDuplicateSummary(repo, { limit: 50 }) : {
        actionableGroups: 0,
        actionableImplementations: 0,
        rawGroups: 0,
        rawImplementations: 0
      };
    } catch {
      return {
        actionableGroups: 0,
        actionableImplementations: 0,
        rawGroups: 0,
        rawImplementations: 0
      };
    }
  })();
  const pipelineOrphans = (() => {
    try {
      return db ? getPipelineOrphanSummary(db) : { orphanCount: 0 };
    } catch {
      return { orphanCount: 0 };
    }
  })();
  const folderization = compilerExplainability?.folderization || {};
  const controlPlaneFoundations = compilerExplainability?.controlPlaneFoundations || null;
  const databaseHealth = controlPlaneFoundations?.databaseHealth || compilerExplainability?.databaseHealth || null;
  const fileUniverse = controlPlaneFoundations?.fileUniverseGranularity || compilerExplainability?.fileUniverseGranularity || null;
  const analysisGeneration = controlPlaneFoundations?.analysisGeneration || compilerExplainability?.analysisGeneration || null;
  const compilerDriftAssessment = driftAssessment || compilerExplainability?.driftAssessment || null;
  const notificationCounts = {
    total: asNumber(recentErrors?.summary?.total, 0),
    warnings: asNumber(recentErrors?.summary?.warnings, 0),
    errors: asNumber(recentErrors?.summary?.errors, 0)
  };
  const pendingFiles = phase2PendingFiles ?? (() => {
    try {
      return db ? getPhase2PendingFiles(db) : 0;
    } catch {
      return 0;
    }
  })();
  const pipelineTimingTelemetry = (() => {
    try {
      return db ? buildPipelineTimingTelemetrySummary(db, {
        projectPath,
        scopePath,
        focusPath,
        runKind: 'index_project',
        compareDays: 3
      }) : null;
    } catch {
      return null;
    }
  })();
  const toolTelemetry = (() => {
    try {
      return db ? buildToolRunTelemetrySummary(db, {
        projectPath,
        scopePath,
        focusPath,
        windowDays: toolRunTelemetryWindowDays
      }) : null;
    } catch {
      return null;
    }
  })();
  const requestDeliveryTelemetry = (() => {
    try {
      return db ? buildMcpRequestDeliverySummary(db, {
        projectPath,
        scopePath,
        focusPath,
        windowDays: toolRunTelemetryWindowDays
      }) : null;
    } catch {
      return null;
    }
  })();
  const topologyTelemetry = (() => {
    try {
      return db ? buildMcpTopologySummary(db, {
        projectPath,
        scopePath,
        focusPath,
        windowDays: toolRunTelemetryWindowDays,
        sessionSummary: mcpSessionSummary,
        requestDeliverySummary: requestDeliveryTelemetry,
        proxyRuntimeTelemetry,
        bridgeRuntimeTelemetry,
        recentErrors,
        persist: false,
        captureSource: 'status.runtime',
        snapshotKind: 'status'
      }) : null;
    } catch {
      return null;
    }
  })();
  const behavior = buildBehaviorScore({
    healthScore: databaseHealth?.healthScore,
    issueCount: issueSummary.total,
    structuralGroups: buildStructuralDuplicateGroups(db),
    conceptualGroups: conceptualSummary.actionableGroups,
    pipelineOrphans: pipelineOrphans.orphanCount,
    watcherAlertCount: Array.isArray(watcherAlerts) ? watcherAlerts.length : 0,
    recentWarningCount: notificationCounts.warnings,
    recentErrorCount: notificationCounts.errors,
    phase2PendingFiles: pendingFiles,
    namingDebt: asNumber(folderization?.namingDebt?.renameTargetCount, 0),
    flatFamilies: asNumber(folderization?.familyState?.stateCounts?.flat, 0),
    liveCoverageRatio: asNumber(fileUniverse?.liveCoverageRatio, 0),
    databaseTrustworthy: Boolean(databaseHealth?.healthy),
    clientSyncState: mcpSessionSummary?.clientSyncState || null,
    clientSyncSeverity: mcpSessionSummary?.clientSyncSeverity || null,
    clientSyncReason: mcpSessionSummary?.clientSyncReason || null
  }, {
    progressScore: 0
  }, compilerDriftAssessment, pipelineTimingTelemetry);

  return {
    graphCoverage,
    issueSummary,
    conceptualSummary,
    structuralGroups: buildStructuralDuplicateGroups(db),
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
    behavior,
    normalizeSnapshotPath
  };
}
