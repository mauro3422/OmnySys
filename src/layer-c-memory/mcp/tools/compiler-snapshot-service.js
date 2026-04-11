/**
 * Shared service for building compiler metrics snapshots and health dashboards.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { compactRecentNotifications } from '../core/recent-notifications.js';
import { buildGovernanceAlerts, mergeRecentNotificationsWithGovernanceAlerts } from '../core/governance-alerts.js';
import { loadNotifications, buildRecentErrorsResponse } from './status-notifications.js';
import {
  attachCompilerSnapshotContracts,
  buildCompilerSnapshotResult
} from './compiler-snapshot-service-helpers.js';
import {
  buildCompilerHealthDashboard,
  buildCompilerHealthPanel,
  buildCompilerMetricsSnapshot,
  buildCanonicalPromotionReport,
  buildCanonicalPromotionSnapshot,
  buildCompilerControlPlane,
  buildCompilerObservabilityContract,
  summarizeCompilerObservabilityContract,
  summarizeCompilerControlPlane,
  buildCompilerSystemInventoryReport,
  buildCompilerSystemInventorySnapshot,
  summarizeCompilerMetricsSnapshot,
  loadCompilerExplainability
} from '../../../shared/compiler/index.js';

export async function buildCompilerSnapshotContext(args = {}, context = {}, overrides = {}) {
  const projectPath = context?.projectPath || null;
  const repo = projectPath ? getRepository(projectPath) : null;
  if (!projectPath || !repo) {
    return {
      success: false,
      error: 'Project repository unavailable'
    };
  }

  const notifications = await loadNotifications(projectPath, context.server, false);
  const compactNotifications = compactRecentNotifications(notifications, { maxLogs: 5, maxWatcherAlerts: 10 });
  const compilerExplainability = await loadCompilerExplainability(
    projectPath,
    compactNotifications.watcherAlerts || [],
    context.sharedState || {},
    context.server?.fileWatcher?.getFileWatcherStats?.() || null,
    {
      scopePath: args?.scopePath || null,
      focusPath: args?.focusPath || null
    }
  );
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
  compilerExplainability.systemInventory = systemInventoryDetail;
  compilerExplainability.canonicalPromotion = canonicalPromotionDetail;
  const governanceAlerts = buildGovernanceAlerts({
    compilerExplainability,
    source: 'snapshot'
  });
  const mergedNotifications = mergeRecentNotificationsWithGovernanceAlerts(compactNotifications, governanceAlerts);
  const recentErrors = buildRecentErrorsResponse(mergedNotifications);

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
  snapshot.systemInventoryDetail = systemInventoryDetail;
  snapshot.systemInventory = systemInventory;
  snapshot.canonicalPromotionDetail = canonicalPromotionDetail;
  snapshot.canonicalPromotion = canonicalPromotion;
  snapshot.startupTelemetry = context.server?.startupTelemetry || null;
  snapshot.current.systemInventory = systemInventory;
  snapshot.current.canonicalPromotion = canonicalPromotion;
  snapshot.current.startupTelemetry = context.server?.startupTelemetry || null;

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
  const observability = buildCompilerObservabilityContract({
    projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    compilerExplainability,
    systemInventory,
    canonicalPromotion,
    metricsSnapshot: snapshot,
    healthDashboard,
    healthPanel,
    startupTelemetry: context.server?.startupTelemetry || null
  });
  const observabilitySummary = summarizeCompilerObservabilityContract(observability);
  const controlPlane = buildCompilerControlPlane({
    projectPath,
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
    startupTelemetry: context.server?.startupTelemetry || null
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

  return buildCompilerSnapshotResult({
    projectPath,
    repo,
    notifications,
    compactNotifications,
    recentErrors,
    ...contracts
  });
}

export default { buildCompilerSnapshotContext };
