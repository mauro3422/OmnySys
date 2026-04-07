import { getCompilerHealthArchiveDb } from './connection-manager.js';
import { asNumber } from '../core-utils.js';
import { normalizeKey } from '#shared/utils/normalize-helpers.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:Compiler:HealthArchive');

export function loadCompilerMetricsArchiveHistory(projectPath, options = {}) {
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
    const rows = db.prepare(`
      SELECT
        captured_at,
        health_score,
        issue_count,
        structural_groups,
        conceptual_groups,
        pipeline_orphans,
        naming_targets,
        live_coverage_ratio,
        active_atoms,
        recent_warning_count,
        recent_error_count,
        phase2_pending_files,
        drift_state,
        drift_score,
        stability_score,
        success_score,
        behavior_state,
        readiness_reason,
        summary_text,
        snapshot_fingerprint
      FROM compiler_metrics_daily_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_key, '') = IFNULL(?, '')
        AND IFNULL(focus_key, '') = IFNULL(?, '')
      ORDER BY captured_at DESC
      LIMIT ?
    `).all(projectPath, snapshotKind, normalizeKey(scopePath), normalizeKey(focusPath), limit) || [];

    const baselineCutoff = new Date(Date.now() - (compareDays * 24 * 60 * 60 * 1000)).toISOString();
    const baselineRow = db.prepare(`
      SELECT
        captured_at,
        health_score,
        issue_count,
        structural_groups,
        conceptual_groups,
        pipeline_orphans,
        naming_targets,
        live_coverage_ratio,
        active_atoms,
        recent_warning_count,
        recent_error_count,
        phase2_pending_files,
        drift_state,
        drift_score,
        stability_score,
        success_score,
        behavior_state,
        readiness_reason,
        summary_text,
        snapshot_fingerprint
      FROM compiler_metrics_daily_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_key, '') = IFNULL(?, '')
        AND IFNULL(focus_key, '') = IFNULL(?, '')
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
    logger.debug(`[HealthArchive] Metrics history load skipped: ${error.message}`);
    return { entries: [], latest: null, previous: null, baseline: null };
  }
}
