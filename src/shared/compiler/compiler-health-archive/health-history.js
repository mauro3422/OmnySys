import { getCompilerHealthArchiveDb } from './connection-manager.js';
import { normalizeKey } from '#shared/utils/normalize-helpers.js';
import { createLogger } from '#utils/logger.js';
import { loadCompilerHealthArchiveSummary } from './health-history-summary.js';
import { summarizeDailyRows } from './archive-history-base.js';

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
    params: [projectPath, snapshotKind, normalizeKey(scopePath), normalizeKey(focusPath)]
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
    const dailyRows = db.prepare(`
      SELECT
        captured_day,
        captured_at,
        snapshot_kind,
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
    `).all(projectPath, snapshotKind, normalizeKey(scopePath), normalizeKey(focusPath), Math.max(limit * 5, 25));
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
      daily: summarizeDailyRows(dailyRows),
      latest: rows[0] || null,
      previous: rows[1] || null,
      baseline: baselineRow
    };
  } catch (error) {
    logger.debug(`[HealthArchive] History load skipped: ${error.message}`);
    return { entries: [], latest: null, previous: null, baseline: null };
  }
}

export { loadCompilerHealthArchiveSummary } from './health-history-summary.js';

export default {
  loadCompilerHealthArchiveHistory,
  loadCompilerHealthArchiveSummary
};
