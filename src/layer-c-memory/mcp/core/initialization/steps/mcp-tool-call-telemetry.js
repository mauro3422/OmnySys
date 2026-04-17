import { createLogger } from '../../../../../utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import {
  isBugModeEnabled,
  isGuardTraceEnabled,
  isToolTraceEnabled
} from '../../../../../shared/runtime-debug-flags.js';
import {
  compactRecentNotifications,
  collectRecentNotifications,
  normalizeRecentNotifications
} from '../../notifications.js';
import { buildRecentErrorsResponse } from '../../../tools/status-notifications.js';
import {
  loadCompilerExplainability,
  buildCompilerMetricsSnapshot,
  summarizeCompilerMetricsSnapshot,
  persistToolRunTelemetry
} from '../../../../../shared/compiler/index.js';
import { getFreshModuleSpecifier } from '../../../tool-module-cache.js';
import { pruneToolPayloadShape } from '../../../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:mcp:tool-telemetry');

const LIVE_TOOL_BYPASS = {
  mcp_omnysystem_get_schema: { module: '../../../tools/get-schema/schema.js', exportName: 'get_schema' },
  mcp_omnysystem_get_server_status: { module: '../../../tools/status.js', exportName: 'get_server_status' },
  mcp_omnysystem_get_recent_errors: { module: '../../../tools/status.js', exportName: 'get_recent_errors' },
  mcp_omnysystem_get_folderization_snapshot: { module: '../../../tools/get-folderization-snapshot.js', exportName: 'get_folderization_snapshot' },
  mcp_omnysystem_get_system_inventory_report: { module: '../../../tools/get-system-inventory.js', exportName: 'get_system_inventory_report' },
  mcp_omnysystem_get_canonical_promotion_report: { module: '../../../tools/get-canonical-promotion/index.js', exportName: 'get_canonical_promotion_report' }
};

function createEmptyNotifications() {
  return {
    count: 0,
    warnings: 0,
    errors: 0,
    logs: [],
    watcherAlerts: []
  };
}

export function createEmptyToolNotifications() {
  return createEmptyNotifications();
}

async function loadBypassHandler(name) {
  const bypass = LIVE_TOOL_BYPASS[name];
  if (!bypass) return null;
  const mod = await import(getFreshModuleSpecifier(bypass.module));
  const handler = mod[bypass.exportName];
  return typeof handler === 'function' ? handler : null;
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

  if (global._omnysysPendingRuntimeErrors && global._omnysysPendingRuntimeErrors.length > 0) {
    const pendingAlerts = global._omnysysPendingRuntimeErrors.map((err, i) => ({
      id: `pending-${i}`,
      source: 'runtime',
      level: err.type === 'cooldown-warning' ? 'warn' : 'error',
      severity: 'medium',
      issueType: `runtime_${err.type || 'error'}`,
      filePath: err.file || null,
      message: err.message || 'unknown',
      detectedAt: err.timestamp || new Date().toISOString(),
      lifecycle: { status: 'active', stale: false },
      confidence: { level: 'high_confidence', score: 90, signal: 'high_signal', role: 'bridge' },
      context: { suggestedAction: err.reason || 'Check recent runtime events' }
    }));

    if (!collected.watcherAlerts) collected.watcherAlerts = [];
    collected.watcherAlerts = [...pendingAlerts, ...collected.watcherAlerts].slice(0, 10);

    if (collected.summary) {
      const warnCount = pendingAlerts.filter((alert) => alert.level === 'warn').length;
      const errCount = pendingAlerts.filter((alert) => alert.level === 'error').length;
      collected.summary.warnings = (collected.summary.warnings || 0) + warnCount;
      collected.summary.errors = (collected.summary.errors || 0) + errCount;
      collected.summary.total = (collected.summary.total || 0) + pendingAlerts.length;
    }

    global._omnysysPendingRuntimeErrors = [];
  }

  return compactRecentNotifications(collected, {
    maxLogs: 3,
    maxWatcherAlerts: 3
  });
}

export async function captureToolMetricsSnapshot(server, recentErrors, args, captureSource) {
  if (!server?.projectPath) {
    return null;
  }

  const repo = getRepository(server.projectPath);
  if (!repo?.db) {
    return null;
  }

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
  const compilerExplainability = await loadCompilerExplainability(
    server.projectPath,
    recentErrors?.watcherAlerts || [],
    server.sharedState || (server.sharedState = {}),
    server.fileWatcher?.getFileWatcherStats?.() || null,
    {
      scopePath,
      focusPath
    }
  );
  if (compilerExplainability) {
    server.liveInsights = compilerExplainability;
  }

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

export function buildToolCallResult(rawResult, recentErrors, provenance) {
  const compactedResult = pruneToolPayloadShape(rawResult);
  const resultWithErrors = recentErrors.count > 0
    ? { _recentErrors: recentErrors, ...compactedResult }
    : compactedResult;

  return {
    ...resultWithErrors,
    _provenance: provenance
  };
}

export function markToolOutcomeReady(transportContext, { at, toolName, success }) {
  try {
    transportContext?.requestDeliveryTracker?.markToolOutcomeReady?.({
      at,
      toolName,
      success
    });
  } catch {
    // Delivery telemetry is advisory; never fail the tool path.
  }
}

export async function loadBypassToolHandler(name) {
  return loadBypassHandler(name);
}

export async function persistToolRunTelemetryForServer(server, telemetry) {
  const result = {
    persisted: false,
    error: null
  };

  try {
    const repo = getRepository(server.projectPath);
    if (repo?.db) {
      persistToolRunTelemetry(repo.db, telemetry);
      result.persisted = true;
    }
  } catch (error) {
    result.error = error.message;
    logger.warn(`[tool-telemetry] Failed to persist run for ${telemetry.toolName}: ${error.message}`);
  }

  return result;
}
