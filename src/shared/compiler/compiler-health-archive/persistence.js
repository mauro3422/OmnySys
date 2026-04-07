import { getCompilerHealthArchiveDb } from './connection-manager.js';
import { buildArchivePersistenceArgs, buildMetricsArchivePersistenceArgs } from './persistence-args.js';

function persistCompilerHealthArchiveSnapshot(projectPath, snapshot = null) {
  if (!projectPath || !snapshot) {
    return null;
  }

  const db = getCompilerHealthArchiveDb(projectPath);
  const stmt = db.prepare(`
    INSERT INTO compiler_health_daily_snapshots (
      project_path, snapshot_kind, scope_path, focus_path, scope_key, focus_key,
      captured_day, captured_at, health_score, health_grade, issue_count,
      structural_groups, conceptual_groups, conceptual_raw_groups, pipeline_orphans,
      naming_targets, live_coverage_ratio, active_atoms, watcher_alert_count,
      recent_warning_count, recent_error_count, phase2_pending_files, drift_state,
      drift_score, stability_score, success_score, behavior_state, client_sync_state,
      client_sync_severity, summary_text, snapshot_fingerprint, payload_json, trend_json
    ) VALUES (
      @project_path, @snapshot_kind, @scope_path, @focus_path, @scope_key, @focus_key,
      @captured_day, @captured_at, @health_score, @health_grade, @issue_count,
      @structural_groups, @conceptual_groups, @conceptual_raw_groups, @pipeline_orphans,
      @naming_targets, @live_coverage_ratio, @active_atoms, @watcher_alert_count,
      @recent_warning_count, @recent_error_count, @phase2_pending_files, @drift_state,
      @drift_score, @stability_score, @success_score, @behavior_state, @client_sync_state,
      @client_sync_severity, @summary_text, @snapshot_fingerprint, @payload_json, @trend_json
    )
    ON CONFLICT(project_path, snapshot_kind, scope_key, focus_key, captured_day)
    DO UPDATE SET
      scope_path = excluded.scope_path, focus_path = excluded.focus_path,
      captured_at = excluded.captured_at, health_score = excluded.health_score,
      health_grade = excluded.health_grade, issue_count = excluded.issue_count,
      structural_groups = excluded.structural_groups, conceptual_groups = excluded.conceptual_groups,
      conceptual_raw_groups = excluded.conceptual_raw_groups, pipeline_orphans = excluded.pipeline_orphans,
      naming_targets = excluded.naming_targets, live_coverage_ratio = excluded.live_coverage_ratio,
      active_atoms = excluded.active_atoms, watcher_alert_count = excluded.watcher_alert_count,
      recent_warning_count = excluded.recent_warning_count, recent_error_count = excluded.recent_error_count,
      phase2_pending_files = excluded.phase2_pending_files, drift_state = excluded.drift_state,
      drift_score = excluded.drift_score, stability_score = excluded.stability_score,
      success_score = excluded.success_score, behavior_state = excluded.behavior_state,
      client_sync_state = excluded.client_sync_state, client_sync_severity = excluded.client_sync_severity,
      summary_text = excluded.summary_text, snapshot_fingerprint = excluded.snapshot_fingerprint,
      payload_json = excluded.payload_json, trend_json = excluded.trend_json
  `);

  return stmt.run(buildArchivePersistenceArgs(snapshot));
}

function persistCompilerMetricsArchiveSnapshot(projectPath, snapshot = null) {
  if (!projectPath || !snapshot) {
    return null;
  }

  const db = getCompilerHealthArchiveDb(projectPath);
  const stmt = db.prepare(`
    INSERT INTO compiler_metrics_daily_snapshots (
      project_path, snapshot_kind, scope_path, focus_path, scope_key, focus_key,
      captured_day, captured_at, health_score, issue_count, structural_groups,
      conceptual_groups, pipeline_orphans, naming_targets, live_coverage_ratio,
      active_atoms, recent_warning_count, recent_error_count, phase2_pending_files,
      drift_state, drift_score, stability_score, success_score, behavior_state,
      readiness_reason, metadata_coverage_pct, integration_coverage_pct,
      folderization_candidate_count, call_links, semantic_links, watcher_alert_count,
      client_sync_state, client_sync_severity, summary_text, snapshot_fingerprint,
      payload_json, trend_json
    ) VALUES (
      @project_path, @snapshot_kind, @scope_path, @focus_path, @scope_key, @focus_key,
      @captured_day, @captured_at, @health_score, @issue_count, @structural_groups,
      @conceptual_groups, @pipeline_orphans, @naming_targets, @live_coverage_ratio,
      @active_atoms, @recent_warning_count, @recent_error_count, @phase2_pending_files,
      @drift_state, @drift_score, @stability_score, @success_score, @behavior_state,
      @readiness_reason, @metadata_coverage_pct, @integration_coverage_pct,
      @folderization_candidate_count, @call_links, @semantic_links, @watcher_alert_count,
      @client_sync_state, @client_sync_severity, @summary_text, @snapshot_fingerprint,
      @payload_json, @trend_json
    )
    ON CONFLICT(project_path, snapshot_kind, scope_key, focus_key, captured_day)
    DO UPDATE SET
      scope_path = excluded.scope_path, focus_path = excluded.focus_path,
      captured_at = excluded.captured_at, health_score = excluded.health_score,
      issue_count = excluded.issue_count, structural_groups = excluded.structural_groups,
      conceptual_groups = excluded.conceptual_groups, pipeline_orphans = excluded.pipeline_orphans,
      naming_targets = excluded.naming_targets, live_coverage_ratio = excluded.live_coverage_ratio,
      active_atoms = excluded.active_atoms, recent_warning_count = excluded.recent_warning_count,
      recent_error_count = excluded.recent_error_count, phase2_pending_files = excluded.phase2_pending_files,
      drift_state = excluded.drift_state, drift_score = excluded.drift_score,
      stability_score = excluded.stability_score, success_score = excluded.success_score,
      behavior_state = excluded.behavior_state, readiness_reason = excluded.readiness_reason,
      metadata_coverage_pct = excluded.metadata_coverage_pct, integration_coverage_pct = excluded.integration_coverage_pct,
      folderization_candidate_count = excluded.folderization_candidate_count, call_links = excluded.call_links,
      semantic_links = excluded.semantic_links, watcher_alert_count = excluded.watcher_alert_count,
      client_sync_state = excluded.client_sync_state, client_sync_severity = excluded.client_sync_severity,
      summary_text = excluded.summary_text, snapshot_fingerprint = excluded.snapshot_fingerprint,
      payload_json = excluded.payload_json, trend_json = excluded.trend_json
  `);

  return stmt.run(buildMetricsArchivePersistenceArgs(snapshot));
}

export { persistCompilerHealthArchiveSnapshot, persistCompilerMetricsArchiveSnapshot };
