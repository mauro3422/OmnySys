import { getCompilerHealthArchiveDb } from './connection-manager.js';
import { asNumber } from '../core-utils.js';
import { normalizeKey } from '#shared/utils/normalize-helpers.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:Compiler:HealthArchive');

function buildArchiveHistoryFilterSql({ projectPath, snapshotKind, scopePath, focusPath }) {
  return {
    sql: `
      SELECT
        captured_at,
        health_score,
        health_grade,
        issue_count,
        structural_groups,
        conceptual_groups,
        conceptual_raw_groups,
        pipeline_orphans,
        naming_targets,
        live_coverage_ratio,
        active_atoms,
        watcher_alert_count,
        recent_warning_count,
        recent_error_count,
        phase2_pending_files,
        drift_state,
        drift_score,
        stability_score,
        success_score,
        behavior_state,
        client_sync_state,
        summary_text,
        snapshot_fingerprint
      FROM compiler_health_daily_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND scope_key = ?
        AND focus_key = ?
      ORDER BY captured_at DESC
      LIMIT ?
    `,
    params: [
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath)
    ]
  };
}

export function loadCompilerHealthArchiveHistory(projectPath, options = {}) {
  if (!projectPath) {
    return { entries: [], latest: null, previous: null, baseline: null };
  }

  const db = getCompilerHealthArchiveDb(projectPath);
  if (!db?.prepare) {
    return { entries: [], latest: null, previous: null, baseline: null };
  }

  const {
    snapshotKind = 'status',
    scopePath = null,
    focusPath = null,
    limit = 12,
    compareDays = 3
  } = options;

  try {
    const filter = buildArchiveHistoryFilterSql({
      projectPath,
      snapshotKind,
      scopePath,
      focusPath
    });
    const rows = db.prepare(filter.sql).all(...filter.params, limit);
    const baselineCutoff = new Date(Date.now() - (compareDays * 24 * 60 * 60 * 1000)).toISOString();
    const baselineRow = db.prepare(`
      SELECT
        captured_at,
        health_score,
        health_grade,
        issue_count,
        structural_groups,
        conceptual_groups,
        conceptual_raw_groups,
        pipeline_orphans,
        naming_targets,
        live_coverage_ratio,
        active_atoms,
        watcher_alert_count,
        recent_warning_count,
        recent_error_count,
        phase2_pending_files,
        drift_state,
        drift_score,
        stability_score,
        success_score,
        behavior_state,
        client_sync_state,
        summary_text,
        snapshot_fingerprint
      FROM compiler_health_daily_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND scope_key = ?
        AND focus_key = ?
        AND captured_at <= ?
      ORDER BY captured_at DESC
      LIMIT 1
    `).get(projectPath, snapshotKind, normalizeKey(scopePath), normalizeKey(focusPath), baselineCutoff) || null;

    return {
      entries: rows,
      latest: rows[0] || null,
      previous: rows[1] || null,
      baseline: baselineRow
    };
  } catch (error) {
    logger.debug(`[HealthArchive] History load skipped: ${error.message}`);
    return { entries: [], latest: null, previous: null, baseline: null };
  }
}

export function loadCompilerHealthArchiveSummary(projectPath, options = {}) {
  if (!projectPath) {
    return null;
  }

  const db = getCompilerHealthArchiveDb(projectPath);
  if (!db?.prepare) {
    return null;
  }

  const {
    snapshotKind = 'status',
    scopePath = null,
    focusPath = null
  } = options;

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
        MAX(CASE WHEN captured_at = (SELECT MAX(captured_at) FROM compiler_health_daily_snapshots WHERE project_path = ? AND snapshot_kind = ? AND scope_key = ? AND focus_key = ?) THEN client_sync_state ELSE NULL END) AS latestClientSyncState
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

    const daysObserved = asNumber(row.totalDays, 0);
    const snapshotsRecorded = asNumber(row.totalSnapshots, 0);
    const averageHealthScore = asNumber(row.averageHealthScore, 0);
    const averageDriftScore = asNumber(row.averageDriftScore, 0);
    const averageStabilityScore = asNumber(row.averageStabilityScore, 0);
    const averageSuccessScore = asNumber(row.averageSuccessScore, 0);

    return {
      projectPath,
      snapshotKind,
      scopePath: scopePath || null,
      focusPath: focusPath || null,
      daysObserved,
      snapshotsRecorded,
      firstCapturedAt: row.firstCapturedAt || null,
      lastCapturedAt: row.lastCapturedAt || null,
      averageHealthScore: Number(averageHealthScore.toFixed(2)),
      averageDriftScore: Number(averageDriftScore.toFixed(2)),
      averageStabilityScore: Number(averageStabilityScore.toFixed(2)),
      averageSuccessScore: Number(averageSuccessScore.toFixed(2)),
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
      summary: [
        `days=${daysObserved}`,
        `avgHealth=${Math.round(averageHealthScore)}`,
        `avgSuccess=${Math.round(averageSuccessScore)}`,
        `errors=${asNumber(row.totalErrorCount, 0)}`,
        `warnings=${asNumber(row.totalWarningCount, 0)}`
      ].join(' | ')
    };
  } catch (error) {
    logger.debug(`[HealthArchive] Summary load skipped: ${error.message}`);
    return null;
  }
}
