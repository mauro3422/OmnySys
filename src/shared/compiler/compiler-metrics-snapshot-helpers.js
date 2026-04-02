/**
 * @fileoverview Internal helpers for compiler metrics snapshot assembly.
 */

import { createHash } from 'node:crypto';
import { normalizeCount } from './contract-helpers.js';
import { normalizeFolderizationPath } from './directory-structure-folderization-data.js';
import { summarizeCompilerMetricDictionary, buildCompilerLayerReliability, buildCompilerMetricDictionary } from './compiler-metric-dictionary.js';
import { buildBehaviorScore, buildCurrentMetrics, summarizeCurrentSnapshotRow, summarizeHistoryRow } from './compiler-metrics-current.js';

function normalizeSnapshotPath(value = '') {
  const normalized = normalizeFolderizationPath(value);
  return normalized || null;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampScore(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

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

function safeJsonStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, currentValue) => {
    if (typeof currentValue === 'bigint') return Number(currentValue);
    if (currentValue instanceof Error) return { name: currentValue.name, message: currentValue.message, stack: currentValue.stack };
    if (currentValue instanceof Map) return Object.fromEntries(currentValue.entries());
    if (currentValue instanceof Set) return Array.from(currentValue.values());
    if (typeof currentValue === 'function') return `[Function ${currentValue.name || 'anonymous'}]`;
    if (currentValue && typeof currentValue === 'object') {
      if (seen.has(currentValue)) return '[Circular]';
      seen.add(currentValue);
    }
    return currentValue;
  });
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

function calculateProgressScore(delta = {}) {
  const weights = {
    healthScore: 1,
    issueCount: -1,
    structuralGroups: -3,
    conceptualGroups: -3,
    pipelineOrphans: -5,
    namingTargets: -0.15,
    flatFamilies: -0.5,
    liveCoverageRatio: 100,
    recentErrorCount: -5,
    recentWarningCount: -1,
    watcherAlertCount: -2,
    phase2PendingFiles: -1,
    alreadyFolderizedFamilies: 0.5
  };
  return Object.entries(weights).reduce((score, [key, weight]) => score + (asNumber(delta[key], 0) * weight), 0);
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

function resolveMinStableTrendDays() {
  const raw = Number(process.env.OMNYSYS_MIN_STABLE_TREND_DAYS);
  if (!Number.isFinite(raw) || raw <= 0) return 0.25;
  return Math.max(0.25, raw);
}

function shouldMuteBootstrapTrend(trend = null) {
  if (!trend || typeof trend !== 'object') return true;
  if (trend.status === 'initial' || trend.status === 'settling') return true;
  const minStableTrendDays = resolveMinStableTrendDays();
  const daysSinceBaseline = asNumber(trend.daysSinceBaseline, 0);
  return daysSinceBaseline > 0 && daysSinceBaseline < minStableTrendDays;
}

function muteBootstrapTrend(trend = null) {
  const minStableTrendDays = resolveMinStableTrendDays();
  return { ...trend, status: trend?.status === 'initial' ? 'initial' : 'settling', progressScore: 0, velocityPerDay: 0, deltaSinceBaseline: {}, summary: trend?.status === 'initial' ? 'First metrics snapshot captured.' : `Bootstrap trend settling; waiting for a baseline at least ${Math.round(minStableTrendDays * 24)}h old.` };
}

function loadCompilerMetricsSnapshotHistory(db, options = {}) {
  if (!db?.prepare) {
    return { entries: [], latest: null, previous: null, baseline: null };
  }

  const {
    projectPath = null,
    snapshotKind = 'status',
    scopePath = null,
    focusPath = null,
    limit = 12,
    compareDays = 3
  } = options;
  const normalizedScope = normalizeSnapshotPath(scopePath);
  const normalizedFocus = normalizeSnapshotPath(focusPath);

  try {
    const rows = db.prepare(`
      SELECT *
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_path, '') = IFNULL(?, '')
        AND IFNULL(focus_path, '') = IFNULL(?, '')
      ORDER BY captured_at DESC
      LIMIT ?
    `).all(projectPath, snapshotKind, normalizedScope, normalizedFocus, limit);

    const baselineCutoff = new Date(Date.now() - (compareDays * 24 * 60 * 60 * 1000)).toISOString();
    const baselineRow = db.prepare(`
      SELECT *
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_path, '') = IFNULL(?, '')
        AND IFNULL(focus_path, '') = IFNULL(?, '')
        AND captured_at <= ?
      ORDER BY captured_at DESC
      LIMIT 1
    `).get(projectPath, snapshotKind, normalizedScope, normalizedFocus, baselineCutoff) || null;

    return {
      entries: rows.map(summarizeHistoryRow),
      latest: summarizeHistoryRow(rows[0] || null),
      previous: summarizeHistoryRow(rows[1] || null),
      baseline: summarizeHistoryRow(baselineRow)
    };
  } catch {
    return { entries: [], latest: null, previous: null, baseline: null };
  }
}

function buildCompilerMetricsTrend(current = null, history = null, compareDays = 3) {
  const previous = history?.previous || null;
  const baseline = history?.baseline || previous || null;
  const minStableTrendDays = resolveMinStableTrendDays();

  if (!current) {
    return {
      status: 'missing',
      daysSincePrevious: 0,
      daysSinceBaseline: 0,
      progressScore: 0,
      velocityPerDay: 0,
      improvingStreak: false,
      behaviorTrend: 0,
      summary: 'No metrics snapshot available.',
      deltaSincePrevious: {},
      deltaSinceBaseline: {}
    };
  }

  const currentCapturedAt = new Date(current.capturedAt || Date.now()).getTime();
  const previousCapturedAt = previous?.capturedAt ? new Date(previous.capturedAt).getTime() : null;
  const baselineCapturedAt = baseline?.capturedAt ? new Date(baseline.capturedAt).getTime() : null;
  const daysSincePrevious = previousCapturedAt ? Math.max(0.01, (currentCapturedAt - previousCapturedAt) / (24 * 60 * 60 * 1000)) : 0;
  const daysSinceBaseline = baselineCapturedAt ? Math.max(0.01, (currentCapturedAt - baselineCapturedAt) / (24 * 60 * 60 * 1000)) : 0;
  const hasStableBaseline = Boolean(baseline) && daysSinceBaseline >= minStableTrendDays;

  const deltaSincePrevious = previous ? {
    healthScore: asNumber(current.healthScore) - asNumber(previous.healthScore),
    issueCount: asNumber(current.issueCount) - asNumber(previous.issueCount),
    structuralGroups: asNumber(current.structuralGroups) - asNumber(previous.structuralGroups),
    conceptualGroups: asNumber(current.conceptualGroups) - asNumber(previous.conceptualGroups),
    conceptualRawGroups: asNumber(current.conceptualRawGroups) - asNumber(previous.conceptualRawGroups),
    pipelineOrphans: asNumber(current.pipelineOrphans) - asNumber(previous.pipelineOrphans),
    folderizationCandidateCount: asNumber(current.folderizationCandidateCount) - asNumber(previous.folderizationCandidateCount),
    flatFamilies: asNumber(current.flatFamilies) - asNumber(previous.flatFamilies),
    mixedFamilies: asNumber(current.mixedFamilies) - asNumber(previous.mixedFamilies),
    alreadyFolderizedFamilies: asNumber(current.alreadyFolderizedFamilies) - asNumber(previous.alreadyFolderizedFamilies),
    namingFamilies: asNumber(current.namingFamilies) - asNumber(previous.namingFamilies),
    namingTargets: asNumber(current.namingTargets) - asNumber(previous.namingTargets),
    namingDebt: asNumber(current.namingDebt) - asNumber(previous.namingDebt),
    liveCoverageRatio: asNumber(current.liveCoverageRatio) - asNumber(previous.liveCoverageRatio),
    activeAtoms: asNumber(current.activeAtoms) - asNumber(previous.activeAtoms),
    zeroAtomFileCount: asNumber(current.zeroAtomFileCount) - asNumber(previous.zeroAtomFileCount),
    callLinks: asNumber(current.callLinks) - asNumber(previous.callLinks),
    semanticLinks: asNumber(current.semanticLinks) - asNumber(previous.semanticLinks),
    watcherAlertCount: asNumber(current.watcherAlertCount) - asNumber(previous.watcherAlertCount),
    recentWarningCount: asNumber(current.recentWarningCount) - asNumber(previous.recentWarningCount),
    recentErrorCount: asNumber(current.recentErrorCount) - asNumber(previous.recentErrorCount),
    phase2PendingFiles: asNumber(current.phase2PendingFiles) - asNumber(previous.phase2PendingFiles)
  } : {};

  const deltaSinceBaseline = hasStableBaseline ? {
    healthScore: asNumber(current.healthScore) - asNumber(baseline.healthScore),
    issueCount: asNumber(current.issueCount) - asNumber(baseline.issueCount),
    structuralGroups: asNumber(current.structuralGroups) - asNumber(baseline.structuralGroups),
    conceptualGroups: asNumber(current.conceptualGroups) - asNumber(baseline.conceptualGroups),
    conceptualRawGroups: asNumber(current.conceptualRawGroups) - asNumber(baseline.conceptualRawGroups),
    pipelineOrphans: asNumber(current.pipelineOrphans) - asNumber(baseline.pipelineOrphans),
    folderizationCandidateCount: asNumber(current.folderizationCandidateCount) - asNumber(baseline.folderizationCandidateCount),
    flatFamilies: asNumber(current.flatFamilies) - asNumber(baseline.flatFamilies),
    mixedFamilies: asNumber(current.mixedFamilies) - asNumber(baseline.mixedFamilies),
    alreadyFolderizedFamilies: asNumber(current.alreadyFolderizedFamilies) - asNumber(baseline.alreadyFolderizedFamilies),
    namingFamilies: asNumber(current.namingFamilies) - asNumber(baseline.namingFamilies),
    namingTargets: asNumber(current.namingTargets) - asNumber(baseline.namingTargets),
    namingDebt: asNumber(current.namingDebt) - asNumber(baseline.namingDebt),
    liveCoverageRatio: asNumber(current.liveCoverageRatio) - asNumber(baseline.liveCoverageRatio),
    activeAtoms: asNumber(current.activeAtoms) - asNumber(baseline.activeAtoms),
    zeroAtomFileCount: asNumber(current.zeroAtomFileCount) - asNumber(baseline.zeroAtomFileCount),
    callLinks: asNumber(current.callLinks) - asNumber(baseline.callLinks),
    semanticLinks: asNumber(current.semanticLinks) - asNumber(baseline.semanticLinks),
    watcherAlertCount: asNumber(current.watcherAlertCount) - asNumber(baseline.watcherAlertCount),
    recentWarningCount: asNumber(current.recentWarningCount) - asNumber(baseline.recentWarningCount),
    recentErrorCount: asNumber(current.recentErrorCount) - asNumber(baseline.recentErrorCount),
    phase2PendingFiles: asNumber(current.phase2PendingFiles) - asNumber(baseline.phase2PendingFiles)
  } : {};

  const progressScore = hasStableBaseline ? calculateProgressScore(deltaSinceBaseline, current, baseline) : 0;
  const velocityPerDay = hasStableBaseline && daysSinceBaseline > 0 ? Number((progressScore / daysSinceBaseline).toFixed(2)) : 0;
  const recentWindow = Array.isArray(history?.entries) ? history.entries.slice(0, 4) : [];
  const improvingStreak = recentWindow.slice(0, 3).every((entry, index, array) => {
    const next = array[index + 1];
    if (!next) return true;
    return asNumber(entry?.healthScore, 0) >= asNumber(next?.healthScore, 0) && asNumber(entry?.issueCount, 0) <= asNumber(next?.issueCount, 0);
  });
  const behaviorTrend = recentWindow.length >= 2 ? (asNumber(recentWindow[0]?.healthScore, 0) - asNumber(recentWindow[recentWindow.length - 1]?.healthScore, 0)) : 0;
  const status = !baseline ? 'initial' : !hasStableBaseline ? 'settling' : progressScore > 0 ? 'improving' : progressScore < 0 ? 'regressing' : 'stable';

  const trend = {
    status,
    compareDays,
    daysSincePrevious,
    daysSinceBaseline,
    progressScore: Number(progressScore.toFixed(2)),
    velocityPerDay,
    improvingStreak,
    behaviorTrend: Number(behaviorTrend.toFixed(2)),
    summary: !baseline ? 'First metrics snapshot captured.' : !hasStableBaseline ? `Bootstrap trend settling; waiting for a baseline at least ${Math.round(minStableTrendDays * 24)}h old.` : buildTrendSummary(deltaSinceBaseline),
    deltaSincePrevious,
    deltaSinceBaseline,
    baselineCapturedAt: baseline?.capturedAt || null,
    previousCapturedAt: previous?.capturedAt || null
  };

  return shouldMuteBootstrapTrend(trend) ? muteBootstrapTrend(trend) : trend;
}

function persistCompilerMetricsSnapshot(db, snapshot = null) {
  if (!db?.prepare || !snapshot) {
    return null;
  }

  const stmt = db.prepare(`INSERT INTO compiler_metrics_snapshots (project_path, snapshot_kind, scope_path, focus_path, capture_source, analysis_generation_id, captured_at, health_score, health_grade, issue_count, structural_groups, conceptual_groups, conceptual_raw_groups, pipeline_orphans, folderization_candidate_count, flat_families, mixed_families, already_folderized_families, naming_families, naming_targets, naming_debt, live_coverage_ratio, active_atoms, zero_atom_file_count, call_links, semantic_links, watcher_alert_count, recent_warning_count, recent_error_count, phase2_pending_files, drift_state, drift_score, stability_score, success_score, success_threshold, mvp_ready, behavior_state, readiness_reason, snapshot_fingerprint, summary_text, payload_json, trend_json) VALUES (@project_path, @snapshot_kind, @scope_path, @focus_path, @capture_source, @analysis_generation_id, @captured_at, @health_score, @health_grade, @issue_count, @structural_groups, @conceptual_groups, @conceptual_raw_groups, @pipeline_orphans, @folderization_candidate_count, @flat_families, @mixed_families, @already_folderized_families, @naming_families, @naming_targets, @naming_debt, @live_coverage_ratio, @active_atoms, @zero_atom_file_count, @call_links, @semantic_links, @watcher_alert_count, @recent_warning_count, @recent_error_count, @phase2_pending_files, @drift_state, @drift_score, @stability_score, @success_score, @success_threshold, @mvp_ready, @behavior_state, @readiness_reason, @snapshot_fingerprint, @summary_text, @payload_json, @trend_json)`);
  return stmt.run(buildSnapshotPersistenceArgs(snapshot));
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
