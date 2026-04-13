/**
 * @fileoverview Snapshot assembly helpers for compiler-snapshot-service.
 *
 * Extracted from buildCompilerSnapshotContext to reduce complexity
 * and improve testability.
 *
 * @module layer-c-memory/mcp/tools/compiler-snapshot-assembly
 */

import {
  buildCompilerMetricsSnapshot,
  buildCanonicalPromotionReport,
  buildCanonicalPromotionSnapshot,
  buildCompilerSystemInventoryReport,
  buildCompilerSystemInventorySnapshot,
  summarizeCompilerMetricsSnapshot,
  buildCompilerHealthDashboard,
  buildCompilerHealthPanel,
  buildCompilerObservabilityContract,
  summarizeCompilerObservabilityContract,
  buildCompilerControlPlane,
  summarizeCompilerControlPlane
} from '../../../shared/compiler/index.js';
import { buildGovernanceAlerts, mergeRecentNotificationsWithGovernanceAlerts } from '../core/governance-alerts.js';
import { buildRecentErrorsResponse } from './status-notifications.js';
import {
  attachCompilerSnapshotContracts,
  buildCompilerSnapshotResult
} from './compiler-snapshot-service-helpers.js';

/**
 * Builds inventory and promotion detail, enriching compilerExplainability.
 */
export function buildInventoryAndPromotion({ projectPath, args, compilerExplainability }) {
  const systemInventoryDetail = buildCompilerSystemInventorySnapshot({
    projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    compilerExplainability,
    toolInventory: null,
    limit: 10
  });
  const systemInventory = buildCompilerSystemInventoryReport(systemInventoryDetail);
  const canonicalPromotionDetail = buildCanonicalPromotionSnapshot({
    projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    systemInventory
  });
  const canonicalPromotion = buildCanonicalPromotionReport(canonicalPromotionDetail);

  // Enrich compilerExplainability with detail objects
  compilerExplainability.systemInventory = systemInventoryDetail;
  compilerExplainability.canonicalPromotion = canonicalPromotionDetail;

  return { systemInventoryDetail, systemInventory, canonicalPromotionDetail, canonicalPromotion };
}

/**
 * Builds notifications with governance alerts merged.
 */
export function buildNotificationsWithAlerts({ compactNotifications, compilerExplainability }) {
  const governanceAlerts = buildGovernanceAlerts({
    compilerExplainability,
    source: 'snapshot'
  });
  const mergedNotifications = mergeRecentNotificationsWithGovernanceAlerts(compactNotifications, governanceAlerts);
  const recentErrors = buildRecentErrorsResponse(mergedNotifications);
  return { mergedNotifications, recentErrors };
}

/**
 * Builds the core metrics snapshot and enriches it with inventory/promotion/startup data.
 */
export function buildEnrichedSnapshot({
  projectPath,
  repo,
  args,
  overrides,
  compilerExplainability,
  systemInventory,
  canonicalPromotion,
  context,
  mergedNotifications,
  recentErrors
}) {
  const snapshot = buildCompilerMetricsSnapshot({
    projectPath,
    repo,
    compilerExplainability,
    systemInventory,
    canonicalPromotion,
    startupTelemetry: context.server?.startupTelemetry || null,
    watcherAlerts: mergedNotifications.watcherAlerts || [],
    recentErrors,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    captureSource: overrides.captureSource || args?.captureSource || 'mcp.tool.get_metrics_snapshot',
    snapshotKind: overrides.snapshotKind || args?.snapshotKind || 'manual',
    compareDays: args?.compareDays || 3,
    historyLimit: args?.historyLimit || 12,
    persist: args?.persist !== false,
    toolRunTelemetryWindowDays: args?.toolRunTelemetryWindowDays || 7
  });

  // Enrich snapshot with detail objects
  const startupTelemetry = context.server?.startupTelemetry || null;
  snapshot.systemInventoryDetail = compilerExplainability.systemInventory;
  snapshot.systemInventory = systemInventory;
  snapshot.canonicalPromotionDetail = compilerExplainability.canonicalPromotion;
  snapshot.canonicalPromotion = canonicalPromotion;
  snapshot.startupTelemetry = startupTelemetry;
  snapshot.current.systemInventory = systemInventory;
  snapshot.current.canonicalPromotion = canonicalPromotion;
  snapshot.current.startupTelemetry = startupTelemetry;

  return snapshot;
}

/**
 * Builds dashboard, health panel, observability contract, and control plane.
 */
export function buildDashboardAndContracts({
  snapshot,
  compilerExplainability,
  mergedNotifications,
  recentErrors,
  systemInventory,
  systemInventoryDetail,
  canonicalPromotion,
  canonicalPromotionDetail,
  args,
  context
}) {
  const compactSnapshot = summarizeCompilerMetricsSnapshot(snapshot);
  const healthDashboard = buildCompilerHealthDashboard(snapshot, compilerExplainability, {
    watcherAlerts: mergedNotifications.watcherAlerts || [],
    recentErrors,
    systemInventory
  });
  healthDashboard.systemInventory = systemInventory;
  healthDashboard.systemInventoryDetail = systemInventoryDetail;
  healthDashboard.canonicalPromotion = canonicalPromotion;
  healthDashboard.canonicalPromotionDetail = canonicalPromotionDetail;

  const healthPanel = buildCompilerHealthPanel(healthDashboard);
  const startupTelemetry = context.server?.startupTelemetry || null;

  const observability = buildCompilerObservabilityContract({
    projectPath: context.projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    compilerExplainability,
    systemInventory,
    canonicalPromotion,
    metricsSnapshot: snapshot,
    healthDashboard,
    healthPanel,
    startupTelemetry
  });
  const observabilitySummary = summarizeCompilerObservabilityContract(observability);

  const controlPlane = buildCompilerControlPlane({
    projectPath: context.projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    compilerExplainability,
    systemInventoryDetail,
    systemInventory,
    canonicalPromotion,
    metricsSnapshot: snapshot,
    healthDashboard,
    healthPanel,
    observability,
    startupTelemetry
  });
  const controlPlaneSummary = summarizeCompilerControlPlane(controlPlane);

  const contracts = attachCompilerSnapshotContracts({
    snapshot,
    compactSnapshot,
    healthDashboard,
    healthPanel,
    observability,
    observabilitySummary,
    controlPlane,
    controlPlaneSummary,
    systemInventory,
    systemInventoryDetail,
    canonicalPromotion,
    canonicalPromotionDetail,
    compilerExplainability
  });

  return { contracts };
}

export { buildCompilerSnapshotResult };

export default {
  buildInventoryAndPromotion,
  buildNotificationsWithAlerts,
  buildEnrichedSnapshot,
  buildDashboardAndContracts,
  buildCompilerSnapshotResult
};
