/**
 * Helpers for MCP tool call execution.
 * Keeps McpSetupStep focused on orchestration.
 */

import { createLogger } from '../../../../../utils/logger.js';
import {
  buildTelemetryProvenance,
  evaluateToolRunTelemetry
} from '../../../../../shared/compiler/index.js';
import {
  buildToolExecutionContext,
  collectToolRecentErrors,
  captureToolMetricsSnapshot,
  buildToolCallResult,
  createEmptyToolNotifications,
  loadBypassToolHandler,
  markToolOutcomeReady,
  persistToolRunTelemetryForServer
} from './mcp-tool-call-telemetry.js';

const logger = createLogger('OmnySys:mcp:tool-telemetry');

export {
  buildToolExecutionContext,
  collectToolRecentErrors
} from './mcp-tool-call-telemetry.js';

export async function executeToolCall(handler, name, server, args = {}, transportContext = null) {
  const startedAt = new Date().toISOString();
  const telemetryScope = {
    scopePath: typeof args.scopePath === 'string' && args.scopePath.trim()
      ? args.scopePath.trim()
      : typeof args.filePath === 'string' && args.filePath.trim()
        ? args.filePath.trim()
        : null,
    focusPath: typeof args.focusPath === 'string' && args.focusPath.trim()
      ? args.focusPath.trim()
      : typeof args.filePath === 'string' && args.filePath.trim()
        ? args.filePath.trim()
        : null
  };
  const beforeNotifications = await collectToolRecentErrors(server, { clearLoggerBuffer: true }).catch(() => createEmptyToolNotifications());
  const beforeSnapshot = await captureToolMetricsSnapshot(server, beforeNotifications, args, 'mcp.tool.before').catch(() => null);

  let rawResult;
  let toolError = null;
  const bypassHandler = await loadBypassToolHandler(name).catch(() => null);
  const effectiveHandler = bypassHandler || handler;

  try {
    rawResult = await effectiveHandler(args, buildToolExecutionContext(server, transportContext));
  } catch (error) {
    toolError = error;
    rawResult = {
      error: error.message,
      code: error.code || 'TOOL_EXECUTION_FAILED'
    };
  }

  const afterNotifications = await collectToolRecentErrors(server, { clearLoggerBuffer: true }).catch(() => createEmptyToolNotifications());
  const afterSnapshot = await captureToolMetricsSnapshot(server, afterNotifications, args, 'mcp.tool.after').catch(() => null);
  const endedAt = new Date().toISOString();
  const telemetry = evaluateToolRunTelemetry({
    projectPath: server.projectPath || null,
    toolName: name,
    scopePath: telemetryScope.scopePath,
    focusPath: telemetryScope.focusPath,
    captureSource: 'mcp.tool',
    transportOrigin: transportContext?.origin || 'unknown',
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
  const telemetryPersistence = await persistToolRunTelemetryForServer(server, telemetry);

  markToolOutcomeReady(transportContext, {
    at: new Date().toISOString(),
    toolName: name,
    success: toolError === null
  });

  if (toolError) {
    throw toolError;
  }

  const recentErrors = afterNotifications;
  const provenance = buildTelemetryProvenance({
    source: name,
    transportOrigin: transportContext?.origin || 'unknown',
    transportOriginSource: transportContext?.source || null
  });
  const resultWithTelemetry = buildToolCallResult(rawResult, recentErrors, provenance);
  return {
    ...resultWithTelemetry,
    _toolTelemetry: {
      persisted: telemetryPersistence.persisted,
      persistenceError: telemetryPersistence.error,
      transportOrigin: telemetry.transportOrigin,
      repairStatus: telemetry.repairStatus,
      repairScore: telemetry.repairScore,
      successThresholdMet: telemetry.successThresholdMet
    }
  };
}
