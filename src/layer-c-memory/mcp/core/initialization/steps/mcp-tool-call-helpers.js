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

function alignFolderizationSnapshotToolResult(rawResult = null) {
  const topCandidate =
    rawResult?.snapshot?.folderization?.candidateReport?.topCandidates?.[0]
    || rawResult?.folderization?.candidateReport?.topCandidates?.[0]
    || rawResult?.folderizationReport?.candidateReport?.topCandidates?.[0]
    || null;

  if (!topCandidate?.recommendedFolder) {
    return rawResult;
  }

  const preferredFolder = topCandidate.recommendedFolder;
  const selectionReason = `Top folderization candidate from the DB is ${topCandidate.familyRoot} in ${topCandidate.directory}.`;
  const creationGuidance = {
    ...(rawResult?.folderization?.creationGuidance || rawResult?.snapshot?.folderization?.creationGuidance || {}),
    mode: 'create_folderized_family',
    matchedBy: 'candidateReport',
    familyDomain: topCandidate.directory || null,
    selectionReason,
    preferredFolder,
    preferredFamilyRoot: topCandidate.familyRoot || null,
    preferredDirectory: topCandidate.directory || null,
    guidance: `${selectionReason} Create the next file inside ${preferredFolder} using a short role basename such as ${(rawResult?.folderization?.creationGuidance?.preferredRoleStems || rawResult?.snapshot?.folderization?.creationGuidance?.preferredRoleStems || [])[0]?.stem || 'core.js'}.`
  };

  const summary = {
    ...(rawResult?.summary || rawResult?.snapshot?.summary || {}),
    recommendedTool: 'folderize_family',
    recommendedAction: `Folderize ${topCandidate.familyRoot} into ${preferredFolder} (confidence ${topCandidate.confidence}).`,
    nextBestFolder: preferredFolder,
    creationNextBestFolder: preferredFolder,
    whyThisFirst: selectionReason,
    folderizationTargetFolder: preferredFolder,
    folderizationTargetReason: selectionReason,
    creationGuidanceFolder: preferredFolder,
    creationGuidanceReason: selectionReason,
    summaryText: String(rawResult?.summary?.summaryText || rawResult?.snapshot?.summary?.summaryText || '')
      .replace(/target=[^|]+/, `target=${preferredFolder}`)
  };

  const folderizationReport = {
    ...(rawResult?.folderization || rawResult?.folderizationReport || {}),
    creationGuidance
  };

  const snapshot = rawResult?.snapshot
    ? {
        ...rawResult.snapshot,
        folderization: {
          ...(rawResult.snapshot.folderization || {}),
          creationGuidance
        },
        summary
      }
    : rawResult?.snapshot;

  return {
    ...rawResult,
    folderizationReport,
    folderization: folderizationReport,
    snapshot,
    summary,
    recommendedAction: summary.recommendedAction,
    nextBestFolder: summary.nextBestFolder,
    nextBestStem: summary.nextBestStem || rawResult?.nextBestStem || null,
    whyThisFirst: summary.whyThisFirst,
    guidance: creationGuidance,
    oneLine: summary.summaryText || rawResult?.oneLine || null
  };
}

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
  const normalizedRawResult = name === 'mcp_omnysystem_get_folderization_snapshot'
    ? alignFolderizationSnapshotToolResult(rawResult)
    : rawResult;
  const resultWithTelemetry = buildToolCallResult(normalizedRawResult, recentErrors, provenance);
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
