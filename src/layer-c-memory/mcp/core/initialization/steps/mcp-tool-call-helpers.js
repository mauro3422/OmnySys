/**
 * Helpers for MCP tool call execution.
 * Keeps McpSetupStep focused on orchestration.
 */

import { buildTelemetryProvenance } from '../../../../../shared/compiler/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { compactRecentNotifications, collectRecentNotifications, normalizeRecentNotifications } from '../../recent-notifications.js';
import { buildRecentErrorsResponse } from '../../../tools/status-notifications.js';
import { loadCompilerExplainability } from '../../../tools/status-compiler-explainability.js';
import { buildCompilerMetricsSnapshot, summarizeCompilerMetricsSnapshot } from '../../../../../shared/compiler/index.js';
import { evaluateToolRunTelemetry, persistToolRunTelemetry } from '../../../../../shared/compiler/tool-run-telemetry.js';

export function buildToolExecutionContext(server) {
  return {
    orchestrator: server.orchestrator,
    cache: server.cache,
    projectPath: server.projectPath,
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

export async function executeToolCall(handler, name, server, args = {}) {
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
    rawResult = await handler(args, buildToolExecutionContext(server));
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

  try {
    const repo = getRepository(server.projectPath);
    if (repo?.db) {
      persistToolRunTelemetry(repo.db, telemetry);
    }
  } catch {
    // Telemetry persistence is advisory.
  }

  if (toolError) {
    throw toolError;
  }

  const recentErrors = afterNotifications;
  const provenance = buildToolCallProvenance(name, server, recentErrors);
  const resultWithTelemetry = buildToolCallResult(rawResult, recentErrors, provenance);
  return {
    ...resultWithTelemetry,
    _toolTelemetry: {
      repairStatus: telemetry.repairStatus,
      repairScore: telemetry.repairScore,
      successThresholdMet: telemetry.successThresholdMet,
      deltas: telemetry.deltas
    }
  };
}
