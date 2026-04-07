import { asNumber } from '../core-utils.js';
import { safeJsonStringify } from '../safe-json.js';
import { compactSnapshotForStorage, compactNotificationsForStorage } from './snapshot-normalizers.js';

function buildToolRunPersistencePayload(run = {}) {
  return {
    before_snapshot_json: safeJsonStringify(compactSnapshotForStorage(run.beforeSnapshot)),
    after_snapshot_json: safeJsonStringify(compactSnapshotForStorage(run.afterSnapshot)),
    before_notifications_json: safeJsonStringify(compactNotificationsForStorage(run.beforeNotifications)),
    after_notifications_json: safeJsonStringify(compactNotificationsForStorage(run.afterNotifications)),
    delta_json: safeJsonStringify(run.deltas || {}),
    args_json: safeJsonStringify(run.args || null)
  };
}

function buildToolRunPersistenceArgs(run = {}) {
  const payload = buildToolRunPersistencePayload(run);

  return {
    project_path: run.projectPath || null,
    tool_name: run.toolName || null,
    scope_path: run.scopePath || null,
    focus_path: run.focusPath || null,
    capture_source: run.captureSource || 'mcp.tool',
    transport_origin: run.transportOrigin || 'unknown',
    started_at: run.startedAt || new Date().toISOString(),
    ended_at: run.endedAt || new Date().toISOString(),
    duration_ms: asNumber(run.durationMs, 0),
    success: run.success === true ? 1 : 0,
    error_message: run.errorMessage || null,
    repair_status: run.repairStatus || null,
    repair_score: asNumber(run.repairScore, 0),
    before_watcher_alert_count: asNumber(run.beforeWatcherAlertCount, 0),
    after_watcher_alert_count: asNumber(run.afterWatcherAlertCount, 0),
    before_recent_warning_count: asNumber(run.beforeRecentWarningCount, 0),
    after_recent_warning_count: asNumber(run.afterRecentWarningCount, 0),
    before_recent_error_count: asNumber(run.beforeRecentErrorCount, 0),
    after_recent_error_count: asNumber(run.afterRecentErrorCount, 0),
    alert_clearance: asNumber(run.alertClearance, 0),
    error_clearance: asNumber(run.errorClearance, 0),
    warning_clearance: asNumber(run.warningClearance, 0),
    snapshot_fingerprint: run.fingerprint || null,
    ...payload
  };
}

export {
  buildToolRunPersistencePayload,
  buildToolRunPersistenceArgs
};
