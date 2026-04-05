/**
 * @fileoverview technical-debt-report-sql.js
 *
 * SQL insertion statement for technical debt report values.
 * Extracted to reduce file size and complexity of the main helpers.
 */

const SNAPSHOT_COLUMNS = [
  'project_path', 'snapshot_kind', 'scope_path', 'focus_path', 'capture_source',
  'analysis_generation_id', 'captured_at', 'health_score', 'health_grade',
  'issue_count', 'structural_groups', 'conceptual_groups', 'conceptual_raw_groups',
  'pipeline_orphans', 'folderization_candidate_count', 'flat_families',
  'mixed_families', 'already_folderized_families', 'naming_families',
  'naming_targets', 'naming_debt', 'live_coverage_ratio', 'active_atoms',
  'zero_atom_file_count', 'call_links', 'semantic_links', 'watcher_alert_count',
  'recent_warning_count', 'recent_error_count', 'phase2_pending_files',
  'drift_state', 'drift_score', 'stability_score', 'success_score',
  'success_threshold', 'mvp_ready', 'behavior_state', 'readiness_reason',
  'snapshot_fingerprint', 'summary_text', 'payload_json', 'trend_json'
];

const INSERT_SQL = `INSERT INTO compiler_metrics_snapshots (${SNAPSHOT_COLUMNS.join(', ')}) VALUES (${SNAPSHOT_COLUMNS.map((c) => `@${c}`).join(', ')})`;

export function runTechnicalDebtReportInsert(db, values) {
  if (!db?.prepare || !values) return null;
  return db.prepare(INSERT_SQL).run(values);
}

export function persistTechnicalDebtReportWithValues(db, reportValues) {
  if (!db?.prepare || !reportValues) return null;
  return runTechnicalDebtReportInsert(db, reportValues);
}
