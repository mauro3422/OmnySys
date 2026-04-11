import { getCompilerHealthArchiveDb } from './connection-manager.js';
import { asNumber } from '../core-utils.js';
import { normalizeKey } from '#shared/utils/normalize-helpers.js';

export function loadCompilerHealthArchiveSummary(projectPath, options = {}) {
  if (!projectPath) {
    return null;
  }

  const db = getCompilerHealthArchiveDb(projectPath);
  if (!db?.prepare) {
    return null;
  }

  const { snapshotKind = 'status', scopePath = null, focusPath = null } = options;

  try {
    const row = db.prepare(`
      SELECT
        COUNT(*) AS totalSnapshots,
        COUNT(DISTINCT captured_day) AS totalDays,
        MIN(captured_at) AS firstCapturedAt,
        MAX(captured_at) AS lastCapturedAt,
        AVG(health_score) AS averageHealthScore,
        AVG(drift_score) AS averageDriftScore,
        AVG(stability_score) AS averageStabilityScore,
        AVG(success_score) AS averageSuccessScore,
        SUM(issue_count) AS totalIssueCount,
        SUM(recent_warning_count) AS totalWarningCount,
        SUM(recent_error_count) AS totalErrorCount,
        SUM(watcher_alert_count) AS totalWatcherAlertCount,
        SUM(CASE WHEN drift_state = 'blocked' THEN 1 ELSE 0 END) AS blockedDays,
        SUM(CASE WHEN drift_state = 'stale' THEN 1 ELSE 0 END) AS staleDays,
        SUM(CASE WHEN drift_state = 'reconciling' THEN 1 ELSE 0 END) AS reconcilingDays,
        SUM(CASE WHEN drift_state = 'watchful' THEN 1 ELSE 0 END) AS watchfulDays,
        SUM(CASE WHEN drift_state = 'fresh' THEN 1 ELSE 0 END) AS freshDays,
        MAX(health_score) AS bestHealthScore,
        MIN(health_score) AS worstHealthScore,
        MAX(CASE WHEN captured_at = (SELECT MAX(captured_at) FROM compiler_health_daily_snapshots WHERE project_path = ? AND snapshot_kind = ? AND scope_key = ? AND focus_key = ?) THEN health_score ELSE NULL END) AS latestHealthScore,
        MAX(CASE WHEN captured_at = (SELECT MAX(captured_at) FROM compiler_health_daily_snapshots WHERE project_path = ? AND snapshot_kind = ? AND scope_key = ? AND focus_key = ?) THEN health_grade ELSE NULL END) AS latestHealthGrade,
        MAX(CASE WHEN captured_at = (SELECT MAX(captured_at) FROM compiler_health_daily_snapshots WHERE project_path = ? AND snapshot_kind = ? AND scope_key = ? AND focus_key = ?) THEN behavior_state ELSE NULL END) AS latestBehaviorState,
        MAX(CASE WHEN captured_at = (SELECT MAX(captured_at) FROM compiler_health_daily_snapshots WHERE project_path = ? AND snapshot_kind = ? AND scope_key = ? AND focus_key = ?) THEN client_sync_state ELSE NULL END) AS latestClientSyncState,
        MAX(captured_at) AS latestCapturedAt
      FROM compiler_health_daily_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND scope_key = ?
        AND focus_key = ?
    `).get(
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath),
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath),
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath),
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath),
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath)
    );

    if (!row) {
      return null;
    }

    return {
      projectPath,
      snapshotKind,
      scopePath: scopePath || null,
      focusPath: focusPath || null,
      daysObserved: asNumber(row.totalDays, 0),
      snapshotsRecorded: asNumber(row.totalSnapshots, 0),
      firstCapturedAt: row.firstCapturedAt || null,
      lastCapturedAt: row.lastCapturedAt || null,
      averageHealthScore: Number(asNumber(row.averageHealthScore, 0).toFixed(2)),
      averageDriftScore: Number(asNumber(row.averageDriftScore, 0).toFixed(2)),
      averageStabilityScore: Number(asNumber(row.averageStabilityScore, 0).toFixed(2)),
      averageSuccessScore: Number(asNumber(row.averageSuccessScore, 0).toFixed(2)),
      totalIssueCount: asNumber(row.totalIssueCount, 0),
      totalWarningCount: asNumber(row.totalWarningCount, 0),
      totalErrorCount: asNumber(row.totalErrorCount, 0),
      totalWatcherAlertCount: asNumber(row.totalWatcherAlertCount, 0),
      blockedDays: asNumber(row.blockedDays, 0),
      staleDays: asNumber(row.staleDays, 0),
      reconcilingDays: asNumber(row.reconcilingDays, 0),
      watchfulDays: asNumber(row.watchfulDays, 0),
      freshDays: asNumber(row.freshDays, 0),
      bestHealthScore: asNumber(row.bestHealthScore, 0),
      worstHealthScore: asNumber(row.worstHealthScore, 0),
      latestHealthScore: asNumber(row.latestHealthScore, 0),
      latestHealthGrade: row.latestHealthGrade || null,
      latestBehaviorState: row.latestBehaviorState || null,
      latestClientSyncState: row.latestClientSyncState || null,
      latestCapturedAt: row.latestCapturedAt || null,
      summary: [
        `days=${asNumber(row.totalDays, 0)}`,
        `avgHealth=${Math.round(asNumber(row.averageHealthScore, 0))}`,
        `avgSuccess=${Math.round(asNumber(row.averageSuccessScore, 0))}`,
        `errors=${asNumber(row.totalErrorCount, 0)}`,
        `warnings=${asNumber(row.totalWarningCount, 0)}`
      ].join(' | ')
    };
  } catch {
    return null;
  }
}
