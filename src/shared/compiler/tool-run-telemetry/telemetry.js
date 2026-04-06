/**
 * @fileoverview Tool run telemetry helpers.
 *
 * Persists MCP tool executions as causal events so we can measure whether a
 * tool invocation repaired watcher noise, reduced drift, or regressed the
 * compiler state.
 *
 * @module shared/compiler/tool-run-telemetry
 */

import { createHash } from 'node:crypto';
import { buildToolRunPersistenceArgs, classifyTelemetryRepair, computeTelemetryDeltas, normalizeTelemetryPath, summarizeSnapshotCounts } from './index.js';
import { buildToolRunTelemetrySummary, summarizeToolRunTelemetry } from './summary.js';

function buildToolRunFingerprint(run = {}) {
  return createHash('sha1')
    .update(JSON.stringify({
      projectPath: run.projectPath || null,
      toolName: run.toolName || null,
      transportOrigin: run.transportOrigin || null,
      startedAt: run.startedAt || null,
      endedAt: run.endedAt || null,
      success: run.success === true,
      repairStatus: run.repairStatus || null,
      before: run.beforeSnapshot || null,
      after: run.afterSnapshot || null
    }))
    .digest('hex')
    .slice(0, 16);
}

export function evaluateToolRunTelemetry({
  projectPath = null,
  toolName = null,
  scopePath = null,
  focusPath = null,
  captureSource = 'mcp.tool',
  transportOrigin = 'unknown',
  startedAt = null,
  endedAt = null,
  success = true,
  errorMessage = null,
  args = null,
  beforeSnapshot = null,
  afterSnapshot = null,
  beforeNotifications = null,
  afterNotifications = null
} = {}) {
  const before = summarizeSnapshotCounts(beforeSnapshot);
  const after = summarizeSnapshotCounts(afterSnapshot);
  const deltas = computeTelemetryDeltas(before, after);
  const repair = classifyTelemetryRepair(before, after, success, deltas, {
    toolName,
    captureSource
  });
  const { alertClearance, errorClearance, warningClearance, repairStatus, repairScore, successThresholdMet } = repair;

  const durationMs = startedAt && endedAt
    ? Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime())
    : 0;

  return {
    projectPath,
    toolName,
    scopePath: normalizeTelemetryPath(scopePath),
    focusPath: normalizeTelemetryPath(focusPath),
    captureSource,
    transportOrigin,
    startedAt,
    endedAt,
    durationMs,
    success: success === true,
    errorMessage: errorMessage || null,
    args: args || null,
    beforeSnapshot: beforeSnapshot || null,
    afterSnapshot: afterSnapshot || null,
    beforeNotifications: beforeNotifications || null,
    afterNotifications: afterNotifications || null,
    repairStatus,
    repairScore,
    beforeWatcherAlertCount: before.watcherAlertCount,
    afterWatcherAlertCount: after.watcherAlertCount,
    beforeRecentWarningCount: before.recentWarningCount,
    afterRecentWarningCount: after.recentWarningCount,
    beforeRecentErrorCount: before.recentErrorCount,
    afterRecentErrorCount: after.recentErrorCount,
    alertClearance,
    errorClearance,
    warningClearance,
    deltas: {
      ...deltas,
      repairScore
    },
    successThresholdMet,
    fingerprint: buildToolRunFingerprint({
      projectPath,
      toolName,
      transportOrigin,
      startedAt,
      endedAt,
      success,
      repairStatus,
      beforeSnapshot: before,
      afterSnapshot: after
    })
  };
}

export function persistToolRunTelemetry(db, run = null) {
  if (!db?.prepare || !run) {
    return null;
  }

  const stmt = db.prepare(`
    INSERT INTO mcp_tool_runs (
      project_path,
      tool_name,
      scope_path,
      focus_path,
      capture_source,
      transport_origin,
      started_at,
      ended_at,
      duration_ms,
      success,
      error_message,
      before_snapshot_json,
      after_snapshot_json,
      before_notifications_json,
      after_notifications_json,
      delta_json,
      repair_status,
      repair_score,
      before_watcher_alert_count,
      after_watcher_alert_count,
      before_recent_warning_count,
      after_recent_warning_count,
      before_recent_error_count,
      after_recent_error_count,
      alert_clearance,
      error_clearance,
      warning_clearance,
      snapshot_fingerprint,
      args_json
    ) VALUES (
      @project_path,
      @tool_name,
      @scope_path,
      @focus_path,
      @capture_source,
      @transport_origin,
      @started_at,
      @ended_at,
      @duration_ms,
      @success,
      @error_message,
      @before_snapshot_json,
      @after_snapshot_json,
      @before_notifications_json,
      @after_notifications_json,
      @delta_json,
      @repair_status,
      @repair_score,
      @before_watcher_alert_count,
      @after_watcher_alert_count,
      @before_recent_warning_count,
      @after_recent_warning_count,
      @before_recent_error_count,
      @after_recent_error_count,
      @alert_clearance,
      @error_clearance,
      @warning_clearance,
      @snapshot_fingerprint,
      @args_json
    )
  `);

  return stmt.run({
    ...buildToolRunPersistenceArgs({
      ...run,
      fingerprint: run.fingerprint || buildToolRunFingerprint(run)
    })
  });
}

export { buildToolRunTelemetrySummary, summarizeToolRunTelemetry };
