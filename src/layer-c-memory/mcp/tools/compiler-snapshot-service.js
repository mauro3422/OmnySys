/**
 * Shared service for building compiler metrics snapshots and health dashboards.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { compactRecentNotifications } from '../core/recent-notifications.js';
import { buildGovernanceAlerts, mergeRecentNotificationsWithGovernanceAlerts } from '../core/governance-alerts.js';
import { loadNotifications, buildRecentErrorsResponse } from './status-notifications.js';
import {
  buildCompilerHealthDashboard,
  buildCompilerHealthPanel,
  buildCompilerMetricsSnapshot,
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

  const compactSnapshot = summarizeCompilerMetricsSnapshot(snapshot);
  const healthDashboard = buildCompilerHealthDashboard(snapshot, compilerExplainability, {
    watcherAlerts: mergedNotifications.watcherAlerts || [],
    recentErrors
  });
  const healthPanel = buildCompilerHealthPanel(healthDashboard);

  return {
    success: true,
    projectPath,
    repo,
    notifications,
    compactNotifications,
    recentErrors,
    compilerExplainability,
    snapshot,
    compactSnapshot,
    healthDashboard,
    healthPanel
  };
}

export default { buildCompilerSnapshotContext };
