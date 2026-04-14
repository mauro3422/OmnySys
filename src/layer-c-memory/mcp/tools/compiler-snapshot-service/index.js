/**
 * Shared service for building compiler metrics snapshots and health dashboards.
 *
 * The main function delegates to compiler-snapshot-assembly.js for the heavy
 * snapshot assembly work, keeping this file as a thin orchestrator.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { compactRecentNotifications } from '../../core/notifications.js';
import { loadNotifications } from '../status-notifications.js';
import { loadCompilerExplainability } from '../../../../shared/compiler/index.js';
import {
  buildInventoryAndPromotion,
  buildNotificationsWithAlerts,
  buildEnrichedSnapshot,
  buildDashboardAndContracts,
  buildCompilerSnapshotResult
} from '../compiler-snapshot-assembly.js';

export async function buildCompilerSnapshotContext(args = {}, context = {}, overrides = {}) {
  const projectPath = context?.projectPath || null;
  const repo = projectPath ? getRepository(projectPath) : null;
  if (!projectPath || !repo) {
    return { success: false, error: 'Project repository unavailable' };
  }

  // Step 1: Load notifications and compiler explainability
  const notifications = await loadNotifications(projectPath, context.server, false);
  const compactNotifications = compactRecentNotifications(notifications, { maxLogs: 5, maxWatcherAlerts: 10 });
  const compilerExplainability = await loadCompilerExplainability(
    projectPath,
    compactNotifications.watcherAlerts || [],
    context.sharedState || {},
    context.server?.fileWatcher?.getFileWatcherStats?.() || null,
    { scopePath: args?.scopePath || null, focusPath: args?.focusPath || null }
  );

  // Step 2: Build inventory and promotion detail
  const { systemInventoryDetail, systemInventory, canonicalPromotionDetail, canonicalPromotion } =
    buildInventoryAndPromotion({ projectPath, args, compilerExplainability });

  // Step 3: Build notifications with governance alerts
  const { mergedNotifications, recentErrors } =
    buildNotificationsWithAlerts({ compactNotifications, compilerExplainability });

  // Step 4: Build enriched metrics snapshot
  const snapshot = buildEnrichedSnapshot({
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
  });

  // Step 5: Build dashboard, contracts and control plane
  const { contracts } = buildDashboardAndContracts({
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
  });

  // Step 6: Build final result
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
