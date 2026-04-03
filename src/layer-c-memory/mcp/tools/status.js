/**
 * Tool: get_server_status
 * Returns the complete status of the OmnySys server.
 */

import { createLogger } from '../../../utils/logger.js';
import {
  getCachedCounts,
  getCachedMetadata,
  getPhase2Status,
  loadCompilerExplainability,
  buildCompilerStatusSummaryEnvelope
} from '../../../shared/compiler/index.js';
import {
  buildServerStatusEnvelope
} from './status-runtime.js';
import { enrichServerStatus } from './status-server-details.js';
import {
  buildRecentErrorsResponse,
  loadNotifications
} from './status-notifications.js';
import { buildGovernanceAlerts, mergeRecentNotificationsWithGovernanceAlerts } from '../core/governance-alerts.js';

const logger = createLogger('OmnySys:status');

export async function get_server_status(args, context) {
  logger.info('[Tool] get_server_status()');
  try {
    const { orchestrator, cache, projectPath, server } = context;
    const phase2Status = getPhase2Status(orchestrator);
    const phase2InProgress = !!phase2Status?.inProgress;
    const cachedMetadata = getCachedMetadata(server, cache);
    const cachedCounts = getCachedCounts(cache, cachedMetadata);

    const status = buildServerStatusEnvelope(server, projectPath, phase2InProgress);
    const { recentErrors } = await enrichServerStatus(
      status,
      args,
      context,
      phase2Status,
      phase2InProgress,
      cachedMetadata,
      cachedCounts
    );
    return buildCompilerStatusSummaryEnvelope(status, recentErrors, {});
  } catch (error) {
    logger.warn(`[Tool] get_server_status degraded: ${error.message}`);
    return {
      initialized: false,
      error: 'STATUS_TOOL_FAILED',
      message: error.message
    };
  }
}

/**
 * Tool: get_recent_errors
 * Returns recent warnings/errors captured by the logger and clears them.
 */
export async function get_recent_errors(args, context) {
  logger.info('[Tool] get_recent_errors()');
  try {
    const notifications = await loadNotifications(context.projectPath, context.server, true);
    const compilerExplainability = context.projectPath
      ? await loadCompilerExplainability(
        context.projectPath,
        notifications.watcherAlerts || [],
        context.server?.sharedState || {},
        context.server?.fileWatcher?.getFileWatcherStats?.() || null,
        {
          scopePath: args?.scopePath || null,
          focusPath: args?.focusPath || null
        }
      )
      : null;
    const governanceAlerts = buildGovernanceAlerts({
      compilerExplainability,
      source: 'recent_errors'
    });
    const mergedNotifications = mergeRecentNotificationsWithGovernanceAlerts(notifications, governanceAlerts);
    return buildRecentErrorsResponse(mergedNotifications);
  } catch (error) {
    logger.warn(`[Tool] get_recent_errors degraded: ${error.message}`);
    return {
      summary: {
        total: 1,
        warnings: 0,
        errors: 1,
        incidents: {
          atomic: 0,
          transaction: 0,
          database: 0,
          others: 1
        }
      },
      logs: [{
        level: 'error',
        message: error.message,
        time: new Date().toISOString()
      }],
      watcherAlerts: []
    };
  }
}
