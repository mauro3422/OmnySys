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
import { asNumber, buildToolRunPersistenceArgs, classifyTelemetryRepair, computeTelemetryDeltas, normalizeTelemetryPath, summarizeSnapshotCounts } from './tool-run-telemetry-helpers.js';

function buildToolRunFingerprint(run = {}) {
  return createHash('sha1')
    .update(JSON.stringify({
      projectPath: run.projectPath || null,
      toolName: run.toolName || null,
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
  const repair = classifyTelemetryRepair(before, after, success, deltas);
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

export function buildToolRunTelemetrySummary(db, options = {}) {
  if (!db?.prepare) {
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      repairedRuns: 0,
      thrashingRuns: 0,
      stableRuns: 0,
      comparableRuns: 0,
      observationRuns: 0,
      pressureRuns: 0,
      clearanceRuns: 0,
      repairYield: 0,
      repairRateOnPressure: 0,
      observationRate: 0,
      toolSuccessRate: 0,
      alertClearanceRate: 0,
      errorClearanceRate: 0,
      averageDurationMs: 0,
      averageRepairScore: 0,
      lastRunAt: null,
      lastSuccessfulRunAt: null,
      topTools: []
    };
  }

  const {
    projectPath = null,
    scopePath = null,
    focusPath = null,
    toolName = null,
    windowDays = 7
  } = options;
  const normalizedScope = normalizeTelemetryPath(scopePath);
  const normalizedFocus = normalizeTelemetryPath(focusPath);
  const since = new Date(Date.now() - (windowDays * 24 * 60 * 60 * 1000)).toISOString();
  const params = [projectPath, since];
  let toolFilterSql = '';

  if (toolName) {
    toolFilterSql += ' AND tool_name = ?';
    params.push(toolName);
  }
  if (normalizedScope) {
    toolFilterSql += ' AND IFNULL(scope_path, \'\') = IFNULL(?, \'\')';
    params.push(normalizedScope);
  }
  if (normalizedFocus) {
    toolFilterSql += ' AND IFNULL(focus_path, \'\') = IFNULL(?, \'\')';
    params.push(normalizedFocus);
  }

  try {
    const totals = db.prepare(`
      SELECT
        COUNT(*) as total_runs,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_runs,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_runs,
        SUM(CASE WHEN repair_status = 'repaired' THEN 1 ELSE 0 END) as repaired_runs,
        SUM(CASE WHEN repair_status = 'thrashing' THEN 1 ELSE 0 END) as thrashing_runs,
        SUM(CASE WHEN repair_status = 'stable' THEN 1 ELSE 0 END) as stable_runs,
        SUM(CASE WHEN after_snapshot_json IS NOT NULL AND before_snapshot_json IS NOT NULL THEN 1 ELSE 0 END) as comparable_runs,
        SUM(CASE WHEN before_watcher_alert_count > 0 OR before_recent_error_count > 0 OR before_recent_warning_count > 0 THEN 1 ELSE 0 END) as pressure_runs,
        SUM(CASE WHEN after_snapshot_json IS NOT NULL OR after_notifications_json IS NOT NULL THEN 1 ELSE 0 END) as observation_runs,
        SUM(CASE WHEN alert_clearance > 0 THEN 1 ELSE 0 END) as alert_clearance_runs,
        SUM(CASE WHEN error_clearance > 0 THEN 1 ELSE 0 END) as error_clearance_runs,
        SUM(CASE WHEN alert_clearance > 0 OR error_clearance > 0 OR warning_clearance > 0 THEN 1 ELSE 0 END) as clearance_runs,
        AVG(duration_ms) as avg_duration_ms,
        AVG(repair_score) as avg_repair_score,
        MAX(ended_at) as last_run_at,
        MAX(CASE WHEN success = 1 THEN ended_at ELSE NULL END) as last_successful_run_at
      FROM mcp_tool_runs
      WHERE project_path = ?
        AND ended_at >= ?
        ${toolFilterSql}
    `).get(...params);

    const topTools = db.prepare(`
      SELECT
        tool_name,
        COUNT(*) as run_count,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        AVG(repair_score) as avg_repair_score,
        MAX(ended_at) as last_run_at
      FROM mcp_tool_runs
      WHERE project_path = ?
        AND ended_at >= ?
        ${toolFilterSql}
      GROUP BY tool_name
      ORDER BY run_count DESC, last_run_at DESC
      LIMIT 5
    `).all(...params).map((row) => ({
      toolName: row.tool_name,
      runCount: asNumber(row.run_count, 0),
      successCount: asNumber(row.success_count, 0),
      successRate: asNumber(row.run_count, 0) > 0 ? Number((asNumber(row.success_count, 0) / asNumber(row.run_count, 0)).toFixed(2)) : 0,
      avgRepairScore: asNumber(row.avg_repair_score, 0),
      lastRunAt: row.last_run_at || null
    }));

    const totalRuns = asNumber(totals?.total_runs, 0);
    const successfulRuns = asNumber(totals?.successful_runs, 0);
    const failedRuns = asNumber(totals?.failed_runs, 0);
    const repairedRuns = asNumber(totals?.repaired_runs, 0);
    const thrashingRuns = asNumber(totals?.thrashing_runs, 0);
    const stableRuns = asNumber(totals?.stable_runs, 0);
    const comparableRuns = asNumber(totals?.comparable_runs, 0);
    const pressureRuns = asNumber(totals?.pressure_runs, 0);
    const observationRuns = asNumber(totals?.observation_runs, 0);
    const alertClearanceRuns = asNumber(totals?.alert_clearance_runs, 0);
    const errorClearanceRuns = asNumber(totals?.error_clearance_runs, 0);
    const clearanceRuns = asNumber(totals?.clearance_runs, 0);

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      repairedRuns,
      thrashingRuns,
      stableRuns,
      comparableRuns,
      observationRuns,
      pressureRuns,
      clearanceRuns,
      repairYield: totalRuns > 0 ? Number((repairedRuns / totalRuns).toFixed(2)) : 0,
      repairRateOnPressure: pressureRuns > 0 ? Number((repairedRuns / pressureRuns).toFixed(2)) : 0,
      observationRate: totalRuns > 0 ? Number((observationRuns / totalRuns).toFixed(2)) : 0,
      toolSuccessRate: totalRuns > 0 ? Number((successfulRuns / totalRuns).toFixed(2)) : 0,
      alertClearanceRate: comparableRuns > 0 ? Number((alertClearanceRuns / comparableRuns).toFixed(2)) : 0,
      errorClearanceRate: comparableRuns > 0 ? Number((errorClearanceRuns / comparableRuns).toFixed(2)) : 0,
      averageDurationMs: asNumber(totals?.avg_duration_ms, 0),
      averageRepairScore: asNumber(totals?.avg_repair_score, 0),
      lastRunAt: totals?.last_run_at || null,
      lastSuccessfulRunAt: totals?.last_successful_run_at || null,
      topTools
    };
  } catch {
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      repairedRuns: 0,
      thrashingRuns: 0,
      stableRuns: 0,
      comparableRuns: 0,
      observationRuns: 0,
      pressureRuns: 0,
      clearanceRuns: 0,
      repairYield: 0,
      repairRateOnPressure: 0,
      observationRate: 0,
      toolSuccessRate: 0,
      alertClearanceRate: 0,
      errorClearanceRate: 0,
      averageDurationMs: 0,
      averageRepairScore: 0,
      lastRunAt: null,
      lastSuccessfulRunAt: null,
      topTools: []
    };
  }
}

export function summarizeToolRunTelemetry(summary = null) {
  if (!summary) {
    return null;
  }

  return {
    totalRuns: summary.totalRuns || 0,
    successfulRuns: summary.successfulRuns || 0,
    failedRuns: summary.failedRuns || 0,
    repairedRuns: summary.repairedRuns || 0,
    thrashingRuns: summary.thrashingRuns || 0,
    stableRuns: summary.stableRuns || 0,
    comparableRuns: summary.comparableRuns || 0,
    observationRuns: summary.observationRuns || 0,
    pressureRuns: summary.pressureRuns || 0,
    clearanceRuns: summary.clearanceRuns || 0,
    repairYield: summary.repairYield || 0,
    repairRateOnPressure: summary.repairRateOnPressure || 0,
    observationRate: summary.observationRate || 0,
    toolSuccessRate: summary.toolSuccessRate || 0,
    alertClearanceRate: summary.alertClearanceRate || 0,
    errorClearanceRate: summary.errorClearanceRate || 0,
    averageDurationMs: summary.averageDurationMs || 0,
    averageRepairScore: summary.averageRepairScore || 0,
    lastRunAt: summary.lastRunAt || null,
    lastSuccessfulRunAt: summary.lastSuccessfulRunAt || null,
    topTools: Array.isArray(summary.topTools) ? summary.topTools.slice(0, 5) : []
  };
}
