import { asNumber } from '../core-utils.js';
import { safeJsonStringify } from '../safe-json.js';
import { normalizeKey, normalizeCapturedDay } from '#shared/utils/normalize-helpers.js';

function buildArchivePersistenceArgs(snapshot = null) {
  const current = snapshot?.current || {};
  return {
    project_path: snapshot?.projectPath || null,
    snapshot_kind: snapshot?.snapshotKind || 'status',
    scope_path: snapshot?.scopePath || null,
    focus_path: snapshot?.focusPath || null,
    scope_key: normalizeKey(snapshot?.scopePath || current.scopePath || ''),
    focus_key: normalizeKey(snapshot?.focusPath || current.focusPath || ''),
    captured_day: normalizeCapturedDay(current.capturedAt),
    captured_at: current.capturedAt || new Date().toISOString(),
    health_score: asNumber(current.healthScore, 0),
    health_grade: current.healthGrade || null,
    issue_count: asNumber(current.issueCount, 0),
    structural_groups: asNumber(current.structuralGroups, 0),
    conceptual_groups: asNumber(current.conceptualGroups, 0),
    conceptual_raw_groups: asNumber(current.conceptualRawGroups, 0),
    pipeline_orphans: asNumber(current.pipelineOrphans, 0),
    naming_targets: asNumber(current.namingTargets, 0),
    live_coverage_ratio: asNumber(current.liveCoverageRatio, 0),
    active_atoms: asNumber(current.activeAtoms, 0),
    watcher_alert_count: asNumber(current.watcherAlertCount, 0),
    recent_warning_count: asNumber(current.recentWarningCount, 0),
    recent_error_count: asNumber(current.recentErrorCount, 0),
    phase2_pending_files: asNumber(current.phase2PendingFiles, 0),
    drift_state: current.driftState || null,
    drift_score: asNumber(current.driftScore, 0),
    stability_score: asNumber(current.stabilityScore, 0),
    success_score: asNumber(current.successScore, 0),
    behavior_state: current.behaviorState || null,
    client_sync_state: current.clientSyncState || null,
    client_sync_severity: current.clientSyncSeverity || null,
    summary_text: snapshot?.summary || current.summaryText || null,
    snapshot_fingerprint: current.snapshotFingerprint || '',
    payload_json: safeJsonStringify({
      current,
      trend: snapshot?.trend || {},
      history: snapshot?.history || {},
      metricDictionary: snapshot?.metricDictionary || null,
      summary: snapshot?.summary || null
    }),
    trend_json: safeJsonStringify(snapshot?.trend || {})
  };
}

function buildMetricsArchivePersistenceArgs(snapshot = null) {
  const current = snapshot?.current || {};
  return {
    project_path: snapshot?.projectPath || null,
    snapshot_kind: snapshot?.snapshotKind || 'status',
    scope_path: snapshot?.scopePath || null,
    focus_path: snapshot?.focusPath || null,
    scope_key: normalizeKey(snapshot?.scopePath || current.scopePath || ''),
    focus_key: normalizeKey(snapshot?.focusPath || current.focusPath || ''),
    captured_day: normalizeCapturedDay(current.capturedAt),
    captured_at: current.capturedAt || new Date().toISOString(),
    health_score: asNumber(current.globalHealthScore ?? current.healthScore, 0),
    issue_count: asNumber(current.issueCount, 0),
    structural_groups: asNumber(current.structuralGroups, 0),
    conceptual_groups: asNumber(current.conceptualGroups, 0),
    pipeline_orphans: asNumber(current.pipelineOrphans, 0),
    naming_targets: asNumber(current.namingTargets, 0),
    live_coverage_ratio: asNumber(current.liveCoverageRatio, 0),
    active_atoms: asNumber(current.activeAtoms, 0),
    recent_warning_count: asNumber(current.recentWarningCount, 0),
    recent_error_count: asNumber(current.recentErrorCount, 0),
    phase2_pending_files: asNumber(current.phase2PendingFiles, 0),
    drift_state: current.driftState || null,
    drift_score: asNumber(current.driftScore, 0),
    stability_score: asNumber(current.stabilityScore, 0),
    success_score: asNumber(current.successScore, 0),
    behavior_state: current.behaviorState || null,
    readiness_reason: current.readinessReason || null,
    metadata_coverage_pct: asNumber(current.metadataCoveragePct, 0),
    integration_coverage_pct: asNumber(current.integrationCoveragePct, 0),
    folderization_candidate_count: asNumber(current.folderizationCandidateCount, 0),
    call_links: asNumber(current.callLinks, 0),
    semantic_links: asNumber(current.semanticLinks, 0),
    watcher_alert_count: asNumber(current.watcherAlertCount, 0),
    client_sync_state: current.clientSyncState || null,
    client_sync_severity: current.clientSyncSeverity || null,
    summary_text: snapshot?.summary || current.summaryText || null,
    snapshot_fingerprint: current.snapshotFingerprint || '',
    payload_json: safeJsonStringify({
      current,
      trend: snapshot?.trend || {},
      history: snapshot?.history || {},
      metricDictionary: snapshot?.metricDictionary || null,
      summary: snapshot?.summary || null
    }),
    trend_json: safeJsonStringify(snapshot?.trend || {})
  };
}

export { buildArchivePersistenceArgs, buildMetricsArchivePersistenceArgs };
