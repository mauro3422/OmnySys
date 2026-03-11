/**
 * Tool: get_server_status
 * Returns the complete status of the OmnySys server.
 */

import { createLogger } from '../../../utils/logger.js';
import {
  getCachedCounts,
  getCachedMetadata,
  getPhase2Status,
  buildTelemetryProvenance
} from '../../../shared/compiler/index.js';
import {
  attachCacheStatus,
  attachOrchestratorStatus,
  attachRuntimeHotReload,
  buildNodeVitals,
  buildServerStatusEnvelope
} from './status-runtime.js';
import {
  attachDeepVitals,
} from './status-compiler.js';
import { loadCompilerExplainability } from './status-compiler-explainability.js';
import { loadMetadataStatus } from './status-metadata.js';
import {
  attachNotificationSignals,
  attachPhase2Status,
  buildRecentErrorsResponse,
  loadNotifications
} from './status-notifications.js';

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
    attachOrchestratorStatus(status, orchestrator);
    attachRuntimeHotReload(status, server);

    const notifications = await loadNotifications(projectPath, server);
    attachNotificationSignals(status, notifications);

    if (phase2InProgress) {
      attachPhase2Status(
        status,
        server,
        cache,
        cachedMetadata,
        cachedCounts,
        phase2Status,
        notifications,
        buildNodeVitals
      );
      return status;
    }

    status.metadata = await loadMetadataStatus(projectPath);
    attachCacheStatus(status, cache);
    status.nodeVitals = buildNodeVitals(server);
    await attachDeepVitals(status, projectPath, server);
    status.telemetryProvenance = buildTelemetryProvenance({
      source: 'status.runtime',
      phase2PendingFiles: status.metadata?.phase2PendingFiles || 0,
      runtimeRestartMode: status.hotReload.runtimeRestartMode,
      pendingRuntimeRestartFiles: status.hotReload.pendingRuntimeRestart?.files || [],
      watcherLifecycle: notifications.watcherLifecycle
    });

    status.compilerExplainability = await loadCompilerExplainability(
      projectPath,
      notifications.watcherAlerts || [],
      status.sharedState || {}
    );

    return status;
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
    return buildRecentErrorsResponse(notifications);
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
