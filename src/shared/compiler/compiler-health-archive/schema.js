function buildArchiveSchemaSql() {
  return `
    CREATE TABLE IF NOT EXISTS compiler_health_daily_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      snapshot_kind TEXT NOT NULL,
      scope_path TEXT,
      focus_path TEXT,
      scope_key TEXT NOT NULL,
      focus_key TEXT NOT NULL,
      captured_day TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      health_score REAL NOT NULL DEFAULT 0,
      health_grade TEXT,
      issue_count INTEGER NOT NULL DEFAULT 0,
      structural_groups INTEGER NOT NULL DEFAULT 0,
      conceptual_groups INTEGER NOT NULL DEFAULT 0,
      conceptual_raw_groups INTEGER NOT NULL DEFAULT 0,
      pipeline_orphans INTEGER NOT NULL DEFAULT 0,
      naming_targets INTEGER NOT NULL DEFAULT 0,
      live_coverage_ratio REAL NOT NULL DEFAULT 0,
      active_atoms INTEGER NOT NULL DEFAULT 0,
      watcher_alert_count INTEGER NOT NULL DEFAULT 0,
      recent_warning_count INTEGER NOT NULL DEFAULT 0,
      recent_error_count INTEGER NOT NULL DEFAULT 0,
      phase2_pending_files INTEGER NOT NULL DEFAULT 0,
      drift_state TEXT,
      drift_score REAL NOT NULL DEFAULT 0,
      stability_score REAL NOT NULL DEFAULT 0,
      success_score REAL NOT NULL DEFAULT 0,
      behavior_state TEXT,
      client_sync_state TEXT,
      client_sync_severity TEXT,
      summary_text TEXT,
      snapshot_fingerprint TEXT NOT NULL,
      payload_json TEXT,
      trend_json TEXT,
      UNIQUE(project_path, snapshot_kind, scope_key, focus_key, captured_day)
    );

    CREATE INDEX IF NOT EXISTS idx_health_archive_project_kind_day
      ON compiler_health_daily_snapshots(project_path, snapshot_kind, captured_day DESC);

    CREATE INDEX IF NOT EXISTS idx_health_archive_scope
      ON compiler_health_daily_snapshots(project_path, scope_key, focus_key);

    CREATE INDEX IF NOT EXISTS idx_health_archive_fingerprint
      ON compiler_health_daily_snapshots(snapshot_fingerprint);

    CREATE TABLE IF NOT EXISTS compiler_metrics_daily_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      snapshot_kind TEXT NOT NULL,
      scope_path TEXT,
      focus_path TEXT,
      scope_key TEXT NOT NULL,
      focus_key TEXT NOT NULL,
      captured_day TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      health_score REAL NOT NULL DEFAULT 0,
      issue_count INTEGER NOT NULL DEFAULT 0,
      structural_groups INTEGER NOT NULL DEFAULT 0,
      conceptual_groups INTEGER NOT NULL DEFAULT 0,
      pipeline_orphans INTEGER NOT NULL DEFAULT 0,
      naming_targets INTEGER NOT NULL DEFAULT 0,
      live_coverage_ratio REAL NOT NULL DEFAULT 0,
      active_atoms INTEGER NOT NULL DEFAULT 0,
      recent_warning_count INTEGER NOT NULL DEFAULT 0,
      recent_error_count INTEGER NOT NULL DEFAULT 0,
      phase2_pending_files INTEGER NOT NULL DEFAULT 0,
      drift_state TEXT,
      drift_score REAL NOT NULL DEFAULT 0,
      stability_score REAL NOT NULL DEFAULT 0,
      success_score REAL NOT NULL DEFAULT 0,
      behavior_state TEXT,
      readiness_reason TEXT,
      metadata_coverage_pct REAL NOT NULL DEFAULT 0,
      integration_coverage_pct REAL NOT NULL DEFAULT 0,
      folderization_candidate_count INTEGER NOT NULL DEFAULT 0,
      call_links INTEGER NOT NULL DEFAULT 0,
      semantic_links INTEGER NOT NULL DEFAULT 0,
      watcher_alert_count INTEGER NOT NULL DEFAULT 0,
      client_sync_state TEXT,
      client_sync_severity TEXT,
      summary_text TEXT,
      snapshot_fingerprint TEXT NOT NULL,
      payload_json TEXT,
      trend_json TEXT,
      UNIQUE(project_path, snapshot_kind, scope_key, focus_key, captured_day)
    );

    CREATE INDEX IF NOT EXISTS idx_metrics_archive_project_kind_day
      ON compiler_metrics_daily_snapshots(project_path, snapshot_kind, captured_day DESC);

    CREATE INDEX IF NOT EXISTS idx_metrics_archive_scope
      ON compiler_metrics_daily_snapshots(project_path, scope_key, focus_key);

    CREATE INDEX IF NOT EXISTS idx_metrics_archive_fingerprint
      ON compiler_metrics_daily_snapshots(snapshot_fingerprint);
  `;
}

export { buildArchiveSchemaSql };
