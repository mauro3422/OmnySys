/**
 * Helpers for MCP tool call execution.
 * Keeps McpSetupStep focused on orchestration.
 */

import { buildTelemetryProvenance } from '../../../../../shared/compiler/index.js';
import {
  isBugModeEnabled,
  isGuardTraceEnabled,
  isToolTraceEnabled
} from '../../../../../shared/runtime-debug-flags.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '../../../../../utils/logger.js';
import { compactRecentNotifications, collectRecentNotifications, normalizeRecentNotifications } from '../../recent-notifications.js';
import { buildRecentErrorsResponse } from '../../../tools/status-notifications.js';
import {
  loadCompilerExplainability,
  buildCompilerMetricsSnapshot,
  summarizeCompilerMetricsSnapshot,
  evaluateToolRunTelemetry,
  persistToolRunTelemetry
} from '../../../../../shared/compiler/index.js';
import {
  buildTransportProvenance,
  normalizeTransportOrigin
} from '../../../transport-provenance.js';

const logger = createLogger('OmnySys:mcp:tool-telemetry');

/**
 * Recursively strips null, undefined, empty arrays, and empty objects from a response.
 * Saves ~30-50% token overhead on large responses with many optional fields.
 * Preserves: false, 0, "", and top-level meta-fields (_recentErrors, _provenance, _toolTelemetry).
 */
function compactResponse(obj) {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    const compacted = obj.map(compactResponse).filter(v => v !== undefined);
    return compacted.length > 0 ? compacted : undefined;
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // Always preserve top-level meta-fields (system needs them)
    if (key.startsWith('_')) {
      result[key] = value;
      continue;
    }
    const compacted = compactResponse(value);
    if (compacted !== undefined) {
      result[key] = compacted;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function buildToolExecutionContext(server, transportContext = null) {
  return {
    orchestrator: server.orchestrator,
    cache: server.cache,
    projectPath: server.projectPath,
    sessionDb: server.projectPath ? getRepository(server.projectPath)?.db || null : null,
    transportContext,
    debugFlags: {
      bugMode: isBugModeEnabled(),
      toolTrace: isToolTraceEnabled(),
      guardTrace: isGuardTraceEnabled()
    },
    server
  };
}

export async function collectToolRecentErrors(server, { clearLoggerBuffer = true } = {}) {
  const collected = normalizeRecentNotifications(await collectRecentNotifications(server.projectPath, {
    clearLoggerBuffer,
    watcherLimit: 10,
    server
  }));

  return compactRecentNotifications(collected, {
    maxLogs: 3,
    maxWatcherAlerts: 3
  });
}

function resolveTelemetryScope(args = {}) {
  const scopePath = typeof args.scopePath === 'string' && args.scopePath.trim()
    ? args.scopePath.trim()
    : typeof args.filePath === 'string' && args.filePath.trim()
      ? args.filePath.trim()
      : null;
  const focusPath = typeof args.focusPath === 'string' && args.focusPath.trim()
    ? args.focusPath.trim()
    : typeof args.filePath === 'string' && args.filePath.trim()
      ? args.filePath.trim()
      : null;

  return { scopePath, focusPath };
}

async function captureToolMetricsSnapshot(server, recentErrors, args, captureSource) {
  if (!server?.projectPath) {
    return null;
  }

  const repo = getRepository(server.projectPath);
  if (!repo?.db) {
    return null;
  }

  const { scopePath, focusPath } = resolveTelemetryScope(args);
  const compilerExplainability = await loadCompilerExplainability(
    server.projectPath,
    recentErrors?.watcherAlerts || [],
    server.sharedState || {},
    server.fileWatcher?.getFileWatcherStats?.() || null,
    {
      scopePath,
      focusPath
    }
  );

  const snapshot = buildCompilerMetricsSnapshot({
    projectPath: server.projectPath,
    repo,
    compilerExplainability,
    watcherAlerts: recentErrors?.watcherAlerts || [],
    recentErrors: recentErrors ? buildRecentErrorsResponse(recentErrors) : null,
    scopePath,
    focusPath,
    captureSource,
    snapshotKind: 'tool-call',
    compareDays: 3,
    historyLimit: 8,
    persist: false
  });

  return summarizeCompilerMetricsSnapshot(snapshot);
}

export function buildToolCallProvenance(name, server, recentErrors, transportContext = null) {
  const transportOrigin = normalizeTransportOrigin(transportContext?.origin, 'unknown');
  const transportProvenance = buildTransportProvenance({
    origin: transportOrigin,
    source: transportContext?.source || 'inferred',
    clientInfo: transportContext?.clientInfo || null,
    metadata: transportContext?.metadata || null,
    sessionId: transportContext?.sessionId || null,
    clientId: transportContext?.clientId || null,
    sessionKind: transportContext?.sessionKind || null
  });

  return buildTelemetryProvenance({
    source: name,
    phase2PendingFiles: server.orchestrator?.phase2Pending || 0,
    runtimeRestartMode: server.runtimeRestartMode || 'manual',
    pendingRuntimeRestartFiles: Array.from(server._pendingHotReloadRestartFiles || []),
    transportOrigin,
    transportOriginSource: transportContext?.source || null,
    transportContext: transportProvenance,
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
  const compactedResult = compactResponse(rawResult);

  const resultWithErrors = recentErrors.count > 0
    ? { _recentErrors: recentErrors, ...compactedResult }
    : compactedResult;

  return {
    ...resultWithErrors,
    _provenance: provenance
  };
}

export async function executeToolCall(handler, name, server, args = {}, transportContext = null) {
  const startedAt = new Date().toISOString();
  const telemetryScope = resolveTelemetryScope(args);
  const beforeNotifications = await collectToolRecentErrors(server, { clearLoggerBuffer: true }).catch(() => ({
    count: 0,
    warnings: 0,
    errors: 0,
    logs: [],
    watcherAlerts: []
  }));
  const beforeSnapshot = await captureToolMetricsSnapshot(server, beforeNotifications, args, 'mcp.tool.before').catch(() => null);

  let rawResult;
  let toolError = null;

  try {
    rawResult = await handler(args, buildToolExecutionContext(server, transportContext));
  } catch (error) {
    toolError = error;
    rawResult = {
      error: error.message,
      code: error.code || 'TOOL_EXECUTION_FAILED'
    };
  }

  const afterNotifications = await collectToolRecentErrors(server, { clearLoggerBuffer: true }).catch(() => ({
    count: 0,
    warnings: 0,
    errors: 0,
    logs: [],
    watcherAlerts: []
  }));
  const afterSnapshot = await captureToolMetricsSnapshot(server, afterNotifications, args, 'mcp.tool.after').catch(() => null);
  const endedAt = new Date().toISOString();
  const telemetry = evaluateToolRunTelemetry({
    projectPath: server.projectPath || null,
    toolName: name,
    scopePath: telemetryScope.scopePath,
    focusPath: telemetryScope.focusPath,
    captureSource: 'mcp.tool',
    transportOrigin: normalizeTransportOrigin(transportContext?.origin, 'unknown'),
    startedAt,
    endedAt,
    success: toolError === null,
    errorMessage: toolError?.message || null,
    args,
    beforeSnapshot,
    afterSnapshot,
    beforeNotifications,
    afterNotifications
  });
  let telemetryPersistence = {
    persisted: false,
    error: null
  };

  try {
    const repo = getRepository(server.projectPath);
    if (repo?.db) {
      persistToolRunTelemetry(repo.db, telemetry);
      telemetryPersistence.persisted = true;
    }
  } catch (error) {
    telemetryPersistence.error = error.message;
    logger.warn(`[tool-telemetry] Failed to persist run for ${name}: ${error.message}`);
  }

  if (toolError) {
    throw toolError;
  }

  const recentErrors = afterNotifications;
  const provenance = buildToolCallProvenance(name, server, recentErrors, transportContext);
  const resultWithTelemetry = buildToolCallResult(rawResult, recentErrors, provenance);
  return {
    ...resultWithTelemetry,
    _toolTelemetry: {
      persisted: telemetryPersistence.persisted,
      persistenceError: telemetryPersistence.error,
      transportOrigin: telemetry.transportOrigin,
      repairStatus: telemetry.repairStatus,
      repairScore: telemetry.repairScore,
      successThresholdMet: telemetry.successThresholdMet,
      deltas: telemetry.deltas
    }
  };
}
