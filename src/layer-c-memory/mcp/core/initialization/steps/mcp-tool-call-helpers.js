/**
 * Helpers for MCP tool call execution.
 * Keeps McpSetupStep focused on orchestration.
 */

import { buildTelemetryProvenance } from '../../../../../shared/compiler/index.js';
import { compactRecentNotifications, collectRecentNotifications, normalizeRecentNotifications } from '../../recent-notifications.js';

export function buildToolExecutionContext(server) {
  return {
    orchestrator: server.orchestrator,
    cache: server.cache,
    projectPath: server.projectPath,
    server
  };
}

export async function collectToolRecentErrors(server) {
  const collected = normalizeRecentNotifications(await collectRecentNotifications(server.projectPath, {
    clearLoggerBuffer: true,
    watcherLimit: 10,
    server
  }));

  return compactRecentNotifications(collected, {
    maxLogs: 3,
    maxWatcherAlerts: 3
  });
}

export function buildToolCallProvenance(name, server, recentErrors) {
  return buildTelemetryProvenance({
    source: name,
    phase2PendingFiles: server.orchestrator?.phase2Pending || 0,
    runtimeRestartMode: server.runtimeRestartMode || 'manual',
    pendingRuntimeRestartFiles: Array.from(server._pendingHotReloadRestartFiles || []),
    watcherLifecycle: {
      total: recentErrors.watcherAlerts?.length || 0,
      byStatus: {
        active: recentErrors.watcherAlerts?.filter(a => a.lifecycle?.status === 'active').length || 0,
        stale: recentErrors.watcherAlerts?.filter(a => a.lifecycle?.status === 'stale').length || 0,
        expired: recentErrors.watcherAlerts?.filter(a => a.lifecycle?.status === 'expired').length || 0
      }
    }
  });
}

export function buildToolCallResult(rawResult, recentErrors, provenance) {
  const resultWithErrors = recentErrors.count > 0
    ? { _recentErrors: recentErrors, ...rawResult }
    : rawResult;

  return {
    ...resultWithErrors,
    _provenance: provenance
  };
}
