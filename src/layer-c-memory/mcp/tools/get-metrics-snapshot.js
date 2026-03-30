/**
 * Tool: mcp_omnysystem_get_metrics_snapshot
 *
 * Captures and persists a canonical compiler/system metrics snapshot with
 * historical comparison and velocity indicators.
 */

import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { compactRecentNotifications } from '../core/recent-notifications.js';
import { loadNotifications, buildRecentErrorsResponse } from './status-notifications.js';
import { loadCompilerExplainability } from './status-compiler-explainability.js';
import {
  buildCompilerMetricsSnapshot,
  summarizeCompilerMetricsSnapshot
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:metrics-snapshot');

export async function get_metrics_snapshot(args, context) {
  logger.info('[Tool] get_metrics_snapshot()');

  try {
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
    const recentErrors = buildRecentErrorsResponse(compactNotifications);
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

    const snapshot = buildCompilerMetricsSnapshot({
      projectPath,
      repo,
      compilerExplainability,
      watcherAlerts: compactNotifications.watcherAlerts || [],
      recentErrors,
      scopePath: args?.scopePath || null,
      focusPath: args?.focusPath || null,
      captureSource: 'mcp.tool.get_metrics_snapshot',
      snapshotKind: args?.snapshotKind || 'manual',
      compareDays: args?.compareDays || 3,
      historyLimit: args?.historyLimit || 12,
      persist: args?.persist !== false
    });

    return {
      success: true,
      aggregationType: 'metrics_snapshot',
      snapshot: summarizeCompilerMetricsSnapshot(snapshot),
      summary: snapshot.summary,
      history: snapshot.history,
      trend: snapshot.trend
    };
  } catch (error) {
    logger.error(`[Tool] get_metrics_snapshot failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_metrics_snapshot };
