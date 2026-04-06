/**
 * @fileoverview Internal helpers for compiler metrics snapshot assembly.
 */

import { createHash } from 'node:crypto';
import { safeJsonStringify } from './safe-json.js';
import { normalizeCount } from './contract-helpers.js';
import { summarizeCompilerMetricDictionary, buildCompilerMetricDictionary } from './compiler-metric-dictionary.js';
import { buildCompilerLayerReliability } from './compiler-metric-reliability.js';
import {
  asNumber,
  buildCompilerMetricsTrend,
  calculateProgressScore,
  loadCompilerMetricsSnapshotHistory,
  muteBootstrapTrend,
  resolveMinStableTrendDays,
  normalizeSnapshotPath,
  shouldMuteBootstrapTrend
} from './compiler-metrics-snapshot-history.js';
import { buildBehaviorScore, buildCurrentMetrics, summarizeCurrentSnapshotRow, summarizeHistoryRow } from './compiler-metrics-current.js';
import { clampScore } from '#shared/utils/normalize-helpers.js';

function gradeFromScore(score = 0) {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

function buildSnapshotFingerprint(snapshot) {
  return createHash('sha1')
    .update(JSON.stringify({
      projectPath: snapshot.projectPath,
      snapshotKind: snapshot.snapshotKind,
      scopePath: snapshot.scopePath,
      focusPath: snapshot.focusPath,
      current: snapshot.current
    }))
    .digest('hex')
    .slice(0, 16);
}

function buildTrendSummary(delta = {}) {
  const parts = [];
  const pushPart = (label, value, suffix = '') => {
    if (!Number.isFinite(value) || value === 0) return;
    const signed = value > 0 ? `+${value}` : `${value}`;
    parts.push(`${label} ${signed}${suffix}`);
  };
  pushPart('health', delta.healthScore);
  pushPart('issues', -delta.issueCount);
  pushPart('structural dups', -delta.structuralGroups);
  pushPart('conceptual dups', -delta.conceptualGroups);
  pushPart('orphans', -delta.pipelineOrphans);
  pushPart('naming targets', -delta.namingTargets);
  pushPart('flat families', -delta.flatFamilies);
  pushPart('coverage', Math.round((delta.liveCoverageRatio || 0) * 100), '%');
  pushPart('atoms', delta.activeAtoms);
  pushPart('errors', -delta.recentErrorCount);
  return parts.length > 0 ? parts.join(', ') : 'No measurable change';
}

function buildSnapshotPersistencePayload(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  return { current: snapshot.current || {}, trend: snapshot.trend || {}, summary: snapshot.summary || null, history: { entries: snapshot.history?.entries || [], previous: snapshot.history?.previous || null, baseline: snapshot.history?.baseline || null } };
}

function getHistoryFingerprint(row = null) {
  if (!row) return null;

  return row.snapshot_fingerprint
    || `${row.captured_at || 'unknown'}|${row.health_score || 0}|${row.issue_count || 0}|${row.summary_text || ''}`;
}

function mergeHistoryRows(primaryRows = [], secondaryRows = []) {
  const rows = [...primaryRows, ...secondaryRows].filter(Boolean);
  const seen = new Set();

  return rows
    .filter((row) => {
      const fingerprint = getHistoryFingerprint(row);
      if (!fingerprint || seen.has(fingerprint)) {
        return false;
      }
      seen.add(fingerprint);
      return true;
    })
    .sort((left, right) => String(right.captured_at || '').localeCompare(String(left.captured_at || '')));
}

function buildSnapshotPersistenceArgs(snapshot = null) {
  const current = snapshot?.current || {};
  return {
    project_path: snapshot?.projectPath || null,
    snapshot_kind: snapshot?.snapshotKind || 'status',
    scope_path: snapshot?.scopePath || null,
    focus_path: snapshot?.focusPath || null,
    capture_source: snapshot?.captureSource || 'status.runtime',
    analysis_generation_id: current.analysisGenerationId || null,
    captured_at: current.capturedAt || new Date().toISOString(),
    health_score: asNumber(current.healthScore, 0),
    health_grade: current.healthGrade || null,
    issue_count: asNumber(current.issueCount, 0),
    structural_groups: asNumber(current.structuralGroups, 0),
    conceptual_groups: asNumber(current.conceptualGroups, 0),
    conceptual_raw_groups: asNumber(current.conceptualRawGroups, 0),
    pipeline_orphans: asNumber(current.pipelineOrphans, 0),
    folderization_candidate_count: asNumber(current.folderizationCandidateCount, 0),
    flat_families: asNumber(current.flatFamilies, 0),
    mixed_families: asNumber(current.mixedFamilies, 0),
    already_folderized_families: asNumber(current.alreadyFolderizedFamilies, 0),
    naming_families: asNumber(current.namingFamilies, 0),
    naming_targets: asNumber(current.namingTargets, 0),
    naming_debt: asNumber(current.namingDebt, 0),
    live_coverage_ratio: asNumber(current.liveCoverageRatio, 0),
    active_atoms: asNumber(current.activeAtoms, 0),
    zero_atom_file_count: asNumber(current.zeroAtomFileCount, 0),
    call_links: asNumber(current.callLinks, 0),
    semantic_links: asNumber(current.semanticLinks, 0),
    watcher_alert_count: asNumber(current.watcherAlertCount, 0),
    recent_warning_count: asNumber(current.recentWarningCount, 0),
    recent_error_count: asNumber(current.recentErrorCount, 0),
    phase2_pending_files: asNumber(current.phase2PendingFiles, 0),
    drift_state: current.driftState || null,
    drift_score: asNumber(current.driftScore, 0),
    stability_score: asNumber(current.stabilityScore, 0),
    success_score: asNumber(current.successScore, 0),
    success_threshold: asNumber(current.successThreshold, 0),
    mvp_ready: current.mvpReady === true ? 1 : 0,
    behavior_state: current.behaviorState || null,
    readiness_reason: current.readinessReason || null,
    snapshot_fingerprint: current.snapshotFingerprint || buildSnapshotFingerprint(snapshot),
    summary_text: snapshot?.summary || current.summaryText || null,
    payload_json: safeJsonStringify(buildSnapshotPersistencePayload(snapshot)),
    trend_json: safeJsonStringify(snapshot?.trend || {})
  };
}

function pruneCompilerMetricsSnapshotHistory(db, snapshot = null) {
  if (!db?.prepare || !snapshot?.current) {
    return null;
  }

  const current = snapshot.current || {};
  const projectPath = snapshot.projectPath || null;
  const snapshotKind = snapshot.snapshotKind || 'status';
  const scopePath = normalizeSnapshotPath(snapshot.scopePath);
  const focusPath = normalizeSnapshotPath(snapshot.focusPath);
  const capturedDay = String(current.capturedAt || new Date().toISOString()).slice(0, 10);

  try {
    const retainedRow = db.prepare(`
      SELECT id
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_path, '') = IFNULL(?, '')
        AND IFNULL(focus_path, '') = IFNULL(?, '')
        AND substr(captured_at, 1, 10) = ?
      ORDER BY captured_at DESC, id DESC
      LIMIT 1
    `).get(projectPath, snapshotKind, scopePath, focusPath, capturedDay) || null;

    if (!retainedRow?.id) {
      return { deleted: 0, retainedId: null, capturedDay };
    }

    const result = db.prepare(`
      DELETE FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_path, '') = IFNULL(?, '')
        AND IFNULL(focus_path, '') = IFNULL(?, '')
        AND substr(captured_at, 1, 10) = ?
        AND id <> ?
    `).run(projectPath, snapshotKind, scopePath, focusPath, capturedDay, retainedRow.id);

    return {
      deleted: asNumber(result?.changes, 0),
      retainedId: retainedRow.id,
      capturedDay
    };
  } catch {
    return null;
  }
}

function normalizeRecentErrors(recentErrors = null) {
  return {
    total: asNumber(recentErrors?.summary?.total, 0),
    warnings: asNumber(recentErrors?.summary?.warnings, 0),
    errors: asNumber(recentErrors?.summary?.errors, 0)
  };
}

function buildActiveAtomsDriftAssessment(current = null, history = null) {
  if (!current) {
    return { state: 'missing', healthy: false, trustworthy: false, severity: 'medium', reason: 'No active atom snapshot is available.', recommendation: 'Capture a compiler metrics snapshot before trusting active atom counts.', evidence: null, delta: 0, deltaPct: 0 };
  }
  const liveRowSync = current.liveRowSync || null;
  const staleRows = asNumber(liveRowSync?.summary?.staleAtomRows, 0)
    + asNumber(liveRowSync?.summary?.staleFileRows, 0)
    + asNumber(liveRowSync?.summary?.staleRiskRows, 0)
    + asNumber(liveRowSync?.summary?.staleRelationRows, 0)
    + asNumber(liveRowSync?.summary?.staleConnectionRows, 0);
  const previous = history?.previous || null;
  const currentActiveAtoms = asNumber(current.activeAtoms, 0);
  const previousActiveAtoms = asNumber(previous?.activeAtoms, 0);
  const delta = currentActiveAtoms - previousActiveAtoms;
  const deltaPct = previousActiveAtoms > 0 ? Number(((delta / previousActiveAtoms) * 100).toFixed(2)) : 0;
  if (staleRows > 0) return { state: 'blocked', healthy: false, trustworthy: false, severity: 'high', reason: `Live support tables are drifting from the atom graph (${staleRows} stale row(s)).`, recommendation: liveRowSync?.before?.recommendedActions?.[0] || 'Reconcile the live support tables before trusting active atom counts.', evidence: liveRowSync, delta, deltaPct };
  if (!previous) return { state: 'initial', healthy: true, trustworthy: true, severity: 'low', reason: 'First active atom snapshot captured.', recommendation: 'Capture another snapshot to establish an active atom baseline.', evidence: { activeAtoms: currentActiveAtoms }, delta, deltaPct };
  const previousScale = Math.max(1, previousActiveAtoms);
  const blockedThreshold = Math.max(250, Math.round(previousScale * 0.25));
  const staleThreshold = Math.max(50, Math.round(previousScale * 0.1));
  const absDelta = Math.abs(delta);
  if (absDelta >= blockedThreshold) return { state: 'blocked', healthy: false, trustworthy: false, severity: 'high', reason: `Active atom counts shifted by ${absDelta} since the previous snapshot (${deltaPct >= 0 ? '+' : ''}${deltaPct}%).`, recommendation: 'Reconcile the database surfaces before trusting active atom counts.', evidence: { activeAtoms: currentActiveAtoms, previousActiveAtoms, delta, deltaPct, blockedThreshold, staleThreshold }, delta, deltaPct };
  if (absDelta >= staleThreshold) return { state: 'stale', healthy: false, trustworthy: false, severity: 'medium', reason: `Active atom counts shifted by ${absDelta} since the previous snapshot (${deltaPct >= 0 ? '+' : ''}${deltaPct}%).`, recommendation: 'Watch the active atom count for desynchronization before trusting downstream metrics.', evidence: { activeAtoms: currentActiveAtoms, previousActiveAtoms, delta, deltaPct, blockedThreshold, staleThreshold }, delta, deltaPct };
  return { state: 'fresh', healthy: true, trustworthy: true, severity: 'low', reason: 'Active atom counts remain aligned with the previous snapshot.', recommendation: 'Keep the database surfaces and live atom graph aligned.', evidence: { activeAtoms: currentActiveAtoms, previousActiveAtoms, delta, deltaPct, blockedThreshold, staleThreshold }, delta, deltaPct };
}

function persistCompilerMetricsSnapshot(db, snapshot = null) {
  if (!db?.prepare || !snapshot) {
    return null;
  }

  const stmt = db.prepare(`INSERT INTO compiler_metrics_snapshots (project_path, snapshot_kind, scope_path, focus_path, capture_source, analysis_generation_id, captured_at, health_score, health_grade, issue_count, structural_groups, conceptual_groups, conceptual_raw_groups, pipeline_orphans, folderization_candidate_count, flat_families, mixed_families, already_folderized_families, naming_families, naming_targets, naming_debt, live_coverage_ratio, active_atoms, zero_atom_file_count, call_links, semantic_links, watcher_alert_count, recent_warning_count, recent_error_count, phase2_pending_files, drift_state, drift_score, stability_score, success_score, success_threshold, mvp_ready, behavior_state, readiness_reason, snapshot_fingerprint, summary_text, payload_json, trend_json) VALUES (@project_path, @snapshot_kind, @scope_path, @focus_path, @capture_source, @analysis_generation_id, @captured_at, @health_score, @health_grade, @issue_count, @structural_groups, @conceptual_groups, @conceptual_raw_groups, @pipeline_orphans, @folderization_candidate_count, @flat_families, @mixed_families, @already_folderized_families, @naming_families, @naming_targets, @naming_debt, @live_coverage_ratio, @active_atoms, @zero_atom_file_count, @call_links, @semantic_links, @watcher_alert_count, @recent_warning_count, @recent_error_count, @phase2_pending_files, @drift_state, @drift_score, @stability_score, @success_score, @success_threshold, @mvp_ready, @behavior_state, @readiness_reason, @snapshot_fingerprint, @summary_text, @payload_json, @trend_json)`);
  const result = stmt.run(buildSnapshotPersistenceArgs(snapshot));
  result.archive = pruneCompilerMetricsSnapshotHistory(db, snapshot);
  return result;
}

export {
  asNumber,
  buildActiveAtomsDriftAssessment,
  buildBehaviorScore,
  buildCompilerLayerReliability,
  buildCompilerMetricDictionary,
  buildCurrentMetrics,
  buildSnapshotFingerprint,
  buildSnapshotPersistenceArgs,
  pruneCompilerMetricsSnapshotHistory,
  buildSnapshotPersistencePayload,
  buildTrendSummary,
  calculateProgressScore,
  clampScore,
  gradeFromScore,
  loadCompilerMetricsSnapshotHistory,
  muteBootstrapTrend,
  normalizeRecentErrors,
  normalizeSnapshotPath,
  persistCompilerMetricsSnapshot,
  resolveMinStableTrendDays,
  safeJsonStringify,
  shouldMuteBootstrapTrend,
  summarizeCompilerMetricDictionary,
  summarizeCurrentSnapshotRow,
  summarizeHistoryRow,
  buildCompilerMetricsTrend
};
