/**
 * @fileoverview Pipeline timing telemetry helpers.
 *
 * Persists pipeline phase timings as historical snapshots so OmnySys can
 * detect performance regressions, slow phases and drift between runs.
 *
 * @module shared/compiler/pipeline-timing-telemetry
 */

import { createHash } from 'node:crypto';
import { normalizeFolderizationPath } from './directory-structure-folderization-data.js';

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampScore(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeTelemetryPath(value = '') {
  const normalized = normalizeFolderizationPath(value);
  return normalized || null;
}

function buildPipelineTimingFingerprint(run = {}) {
  return createHash('sha1')
    .update(JSON.stringify({
      projectPath: run.projectPath || null,
      runKind: run.runKind || null,
      startedAt: run.startedAt || null,
      endedAt: run.endedAt || null,
      scopePath: run.scopePath || null,
      focusPath: run.focusPath || null,
      phases: run.phaseTimings || []
    }))
    .digest('hex')
    .slice(0, 16);
}

function normalizePhaseTimings(phaseTimings = []) {
  if (!Array.isArray(phaseTimings)) {
    return [];
  }

  return phaseTimings
    .map((phase, index) => ({
      index,
      name: phase?.name || phase?.label || `phase-${index + 1}`,
      elapsedMs: asNumber(phase?.elapsedMs ?? phase?.elapsed ?? phase?.durationMs, 0),
      memoryDeltaMb: asNumber(phase?.memoryDeltaMb ?? phase?.memory?.heapUsed ?? phase?.memory?.rss ?? 0, 0),
      memory: phase?.memory || null
    }))
    .filter((phase) => phase.elapsedMs >= 0);
}

function summarizePhaseTimings(phaseTimings = []) {
  const phases = normalizePhaseTimings(phaseTimings);
  const totalDurationMs = phases.reduce((sum, phase) => sum + phase.elapsedMs, 0);
  const phaseCount = phases.length;
  const averagePhaseMs = phaseCount > 0 ? totalDurationMs / phaseCount : 0;
  const slowThresholdMs = Math.max(1000, averagePhaseMs * 1.75);
  const slowPhases = phases.filter((phase) => phase.elapsedMs >= slowThresholdMs);
  const maxPhase = phases.reduce((winner, phase) => (phase.elapsedMs > (winner?.elapsedMs || -1) ? phase : winner), null);

  return {
    phaseCount,
    totalDurationMs: Number(totalDurationMs.toFixed(2)),
    averagePhaseMs: Number(averagePhaseMs.toFixed(2)),
    slowThresholdMs: Number(slowThresholdMs.toFixed(2)),
    slowPhaseCount: slowPhases.length,
    maxPhaseName: maxPhase?.name || null,
    maxPhaseMs: maxPhase ? Number(maxPhase.elapsedMs.toFixed(2)) : 0,
    topSlowPhases: slowPhases
      .slice()
      .sort((left, right) => right.elapsedMs - left.elapsedMs)
      .slice(0, 5)
      .map((phase) => ({
        name: phase.name,
        elapsedMs: Number(phase.elapsedMs.toFixed(2)),
        memoryDeltaMb: Number(phase.memoryDeltaMb.toFixed(2))
      }))
  };
}

function summarizeTimingRow(row = null) {
  if (!row) {
    return null;
  }

  let payload = null;
  let trend = null;
  try {
    payload = row.payload_json ? JSON.parse(row.payload_json) : null;
  } catch {
    payload = null;
  }

  try {
    trend = row.trend_json ? JSON.parse(row.trend_json) : null;
  } catch {
    trend = null;
  }

  const current = payload?.current || {};
  return {
    capturedAt: row.captured_at || null,
    projectPath: row.project_path || null,
    runKind: payload?.runKind || row.snapshot_kind || 'pipeline-timing',
    scopePath: row.scope_path || null,
    focusPath: row.focus_path || null,
    totalDurationMs: asNumber(current.totalDurationMs, 0),
    averagePhaseMs: asNumber(current.averagePhaseMs, 0),
    phaseCount: asNumber(current.phaseCount, 0),
    slowPhaseCount: asNumber(current.slowPhaseCount, 0),
    slowThresholdMs: asNumber(current.slowThresholdMs, 0),
    maxPhaseName: current.maxPhaseName || null,
    maxPhaseMs: asNumber(current.maxPhaseMs, 0),
    performanceState: current.performanceState || 'unknown',
    summaryText: row.summary_text || current.summaryText || null,
    trend,
    topSlowPhases: Array.isArray(current.topSlowPhases) ? current.topSlowPhases : [],
    phaseTimings: Array.isArray(current.phaseTimings) ? current.phaseTimings : []
  };
}

function loadTimingHistory(db, options = {}) {
  if (!db?.prepare) {
    return {
      entries: [],
      latest: null,
      previous: null,
      baseline: null
    };
  }

  const {
    projectPath = null,
    runKind = 'pipeline',
    scopePath = null,
    focusPath = null,
    limit = 12,
    compareDays = 3
  } = options;
  const normalizedScope = normalizeTelemetryPath(scopePath);
  const normalizedFocus = normalizeTelemetryPath(focusPath);

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
    `).all(projectPath, `pipeline-timing:${runKind}`, normalizedScope, normalizedFocus, limit);

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
    `).get(projectPath, `pipeline-timing:${runKind}`, normalizedScope, normalizedFocus, baselineCutoff) || null;

    return {
      entries: rows.map(summarizeTimingRow),
      latest: summarizeTimingRow(rows[0] || null),
      previous: summarizeTimingRow(rows[1] || null),
      baseline: summarizeTimingRow(baselineRow)
    };
  } catch {
    return {
      entries: [],
      latest: null,
      previous: null,
      baseline: null
    };
  }
}

function buildTimingTrend(current = null, history = null, compareDays = 3) {
  const previous = history?.previous || null;
  const baseline = history?.baseline || previous || null;

  if (!current) {
    return {
      status: 'missing',
      compareDays,
      daysSincePrevious: 0,
      daysSinceBaseline: 0,
      progressScore: 0,
      velocityPerDay: 0,
      summary: 'No pipeline timing snapshot available.',
      deltaSincePrevious: {},
      deltaSinceBaseline: {}
    };
  }

  const currentCapturedAt = new Date(current.capturedAt || Date.now()).getTime();
  const previousCapturedAt = previous?.capturedAt ? new Date(previous.capturedAt).getTime() : null;
  const baselineCapturedAt = baseline?.capturedAt ? new Date(baseline.capturedAt).getTime() : null;
  const daysSincePrevious = previousCapturedAt ? Math.max(0.01, (currentCapturedAt - previousCapturedAt) / (24 * 60 * 60 * 1000)) : 0;
  const daysSinceBaseline = baselineCapturedAt ? Math.max(0.01, (currentCapturedAt - baselineCapturedAt) / (24 * 60 * 60 * 1000)) : 0;

  const deltaSincePrevious = previous ? {
    totalDurationMs: asNumber(current.totalDurationMs) - asNumber(previous.totalDurationMs),
    averagePhaseMs: asNumber(current.averagePhaseMs) - asNumber(previous.averagePhaseMs),
    phaseCount: asNumber(current.phaseCount) - asNumber(previous.phaseCount),
    slowPhaseCount: asNumber(current.slowPhaseCount) - asNumber(previous.slowPhaseCount),
    maxPhaseMs: asNumber(current.maxPhaseMs) - asNumber(previous.maxPhaseMs)
  } : {};

  const deltaSinceBaseline = baseline ? {
    totalDurationMs: asNumber(current.totalDurationMs) - asNumber(baseline.totalDurationMs),
    averagePhaseMs: asNumber(current.averagePhaseMs) - asNumber(baseline.averagePhaseMs),
    phaseCount: asNumber(current.phaseCount) - asNumber(baseline.phaseCount),
    slowPhaseCount: asNumber(current.slowPhaseCount) - asNumber(baseline.slowPhaseCount),
    maxPhaseMs: asNumber(current.maxPhaseMs) - asNumber(baseline.maxPhaseMs)
  } : {};

  const totalDelta = asNumber(deltaSinceBaseline.totalDurationMs, 0);
  const progressScore = clampScore(100 - Math.min(80, Math.abs(totalDelta) / 1000), 0, 100);
  const velocityPerDay = daysSinceBaseline > 0 ? Number(((-totalDelta) / daysSinceBaseline).toFixed(2)) : 0;
  const status = !baseline
    ? 'initial'
    : totalDelta < -500
      ? 'improving'
      : totalDelta > 500
        ? 'regressing'
        : 'stable';

  const summary = !baseline
    ? 'First pipeline timing snapshot captured.'
    : totalDelta === 0
      ? 'Pipeline timing is unchanged.'
      : `TOTAL ${totalDelta > 0 ? '+' : ''}${Math.round(totalDelta)}ms vs baseline`;

  return {
    status,
    compareDays,
    daysSincePrevious,
    daysSinceBaseline,
    progressScore: Number(progressScore.toFixed(2)),
    velocityPerDay,
    summary,
    deltaSincePrevious,
    deltaSinceBaseline,
    baselineCapturedAt: baseline?.capturedAt || null,
    previousCapturedAt: previous?.capturedAt || null
  };
}

export function evaluatePipelineTimingTelemetry({
  projectPath = null,
  runKind = 'pipeline',
  scopePath = null,
  focusPath = null,
  captureSource = 'pipeline.run',
  startedAt = null,
  endedAt = null,
  success = true,
  errorMessage = null,
  phaseTimings = []
} = {}) {
  const phases = normalizePhaseTimings(phaseTimings);
  const phaseSummary = summarizePhaseTimings(phases);
  const durationMs = startedAt && endedAt
    ? Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime())
    : phaseSummary.totalDurationMs;
  const performanceState = !success
    ? 'failed'
    : phaseSummary.slowPhaseCount > 0 || durationMs > 120000
      ? 'regressing'
      : durationMs > 45000
        ? 'watchful'
        : 'stable';
  const performanceScore = clampScore(
    100 - Math.min(70, (durationMs / 1000) * 0.35) - (phaseSummary.slowPhaseCount * 4),
    0,
    100
  );

  return {
    projectPath,
    runKind,
    scopePath: normalizeTelemetryPath(scopePath),
    focusPath: normalizeTelemetryPath(focusPath),
    captureSource,
    startedAt,
    endedAt,
    success: success === true,
    errorMessage: errorMessage || null,
    phaseTimings: phases,
    current: {
      totalDurationMs: Number(durationMs.toFixed(2)),
      averagePhaseMs: phaseSummary.averagePhaseMs,
      phaseCount: phaseSummary.phaseCount,
      slowPhaseCount: phaseSummary.slowPhaseCount,
      slowThresholdMs: phaseSummary.slowThresholdMs,
      maxPhaseName: phaseSummary.maxPhaseName,
      maxPhaseMs: phaseSummary.maxPhaseMs,
      topSlowPhases: phaseSummary.topSlowPhases,
      performanceState,
      performanceScore: Number(performanceScore.toFixed(2)),
      summaryText: phases.length > 0
        ? `Pipeline ${Math.round(durationMs)}ms | slow=${phaseSummary.slowPhaseCount}/${phaseSummary.phaseCount} | max=${phaseSummary.maxPhaseName || 'n/a'}:${Math.round(phaseSummary.maxPhaseMs)}ms`
        : 'No pipeline timings captured.'
    },
    trend: {
      status: 'initial',
      summary: phases.length > 0
        ? `Pipeline ${performanceState}${performanceState === 'stable' ? '' : performanceState === 'regressing' ? '' : ''}`
        : 'No pipeline timing trend available.'
    },
    summary: phases.length > 0
      ? `Pipeline ${Math.round(durationMs)}ms | slow=${phaseSummary.slowPhaseCount}/${phaseSummary.phaseCount} | max=${phaseSummary.maxPhaseName || 'n/a'}:${Math.round(phaseSummary.maxPhaseMs)}ms`
      : 'No pipeline timings captured.',
    performanceState,
    performanceScore: Number(performanceScore.toFixed(2)),
    fingerprint: buildPipelineTimingFingerprint({
      projectPath,
      runKind,
      startedAt,
      endedAt,
      scopePath,
      focusPath,
      phaseTimings: phases
    })
  };
}

export function persistPipelineTimingTelemetry(db, telemetry = null) {
  if (!db?.prepare || !telemetry) {
    return null;
  }

  const stmt = db.prepare(`
    INSERT INTO compiler_metrics_snapshots (
      project_path,
      snapshot_kind,
      scope_path,
      focus_path,
      capture_source,
      analysis_generation_id,
      captured_at,
      health_score,
      health_grade,
      issue_count,
      structural_groups,
      conceptual_groups,
      conceptual_raw_groups,
      pipeline_orphans,
      folderization_candidate_count,
      flat_families,
      mixed_families,
      already_folderized_families,
      naming_families,
      naming_targets,
      naming_debt,
      live_coverage_ratio,
      zero_atom_file_count,
      call_links,
      semantic_links,
      watcher_alert_count,
      recent_warning_count,
      recent_error_count,
      phase2_pending_files,
      drift_state,
      drift_score,
      stability_score,
      success_score,
      success_threshold,
      mvp_ready,
      behavior_state,
      readiness_reason,
      snapshot_fingerprint,
      summary_text,
      payload_json,
      trend_json
    ) VALUES (
      @project_path,
      @snapshot_kind,
      @scope_path,
      @focus_path,
      @capture_source,
      NULL,
      @captured_at,
      @health_score,
      @health_grade,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      @drift_state,
      @drift_score,
      @stability_score,
      @success_score,
      @success_threshold,
      @mvp_ready,
      @behavior_state,
      @readiness_reason,
      @snapshot_fingerprint,
      @summary_text,
      @payload_json,
      @trend_json
    )
  `);

  return stmt.run({
    project_path: telemetry.projectPath || null,
    snapshot_kind: `pipeline-timing:${telemetry.runKind || 'pipeline'}`,
    scope_path: telemetry.scopePath || null,
    focus_path: telemetry.focusPath || null,
    capture_source: telemetry.captureSource || 'pipeline.run',
    captured_at: telemetry.endedAt || telemetry.startedAt || new Date().toISOString(),
    health_score: telemetry.performanceScore || 0,
    health_grade: telemetry.performanceScore >= 90 ? 'A+' : telemetry.performanceScore >= 80 ? 'A' : telemetry.performanceScore >= 70 ? 'B' : telemetry.performanceScore >= 60 ? 'C' : 'D',
    drift_state: telemetry.performanceState || null,
    drift_score: telemetry.performanceScore || 0,
    stability_score: telemetry.performanceScore || 0,
    success_score: telemetry.performanceScore || 0,
    success_threshold: 0,
    mvp_ready: telemetry.success === true ? 1 : 0,
    behavior_state: telemetry.performanceState || null,
    readiness_reason: telemetry.summary || telemetry.current?.summaryText || null,
    snapshot_fingerprint: telemetry.fingerprint || buildPipelineTimingFingerprint(telemetry),
    summary_text: telemetry.summary || telemetry.current?.summaryText || null,
    payload_json: JSON.stringify({
      projectPath: telemetry.projectPath || null,
      runKind: telemetry.runKind || 'pipeline',
      scopePath: telemetry.scopePath || null,
      focusPath: telemetry.focusPath || null,
      captureSource: telemetry.captureSource || 'pipeline.run',
      startedAt: telemetry.startedAt || null,
      endedAt: telemetry.endedAt || null,
      success: telemetry.success === true,
      errorMessage: telemetry.errorMessage || null,
      current: telemetry.current || null,
      phaseTimings: telemetry.phaseTimings || []
    }),
    trend_json: JSON.stringify(telemetry.trend || null)
  });
}

export function buildPipelineTimingTelemetrySummary(db, options = {}) {
  if (!db?.prepare) {
    return null;
  }

  const {
    projectPath = null,
    runKind = 'pipeline',
    scopePath = null,
    focusPath = null,
    limit = 12,
    compareDays = 3
  } = options;
  const history = loadTimingHistory(db, { projectPath, runKind, scopePath, focusPath, limit, compareDays });
  const current = history.latest || null;
  const trend = buildTimingTrend(current, history, compareDays);

  if (!current) {
    return null;
  }

  const currentSummary = {
    ...current,
    performanceState: current.performanceState || trend.status || 'unknown',
    summaryText: current.summaryText || trend.summary || null
  };

  const performanceState = trend.status || current.performanceState || 'unknown';
  const performanceScore = current.totalDurationMs > 0
    ? clampScore(100 - Math.min(80, current.totalDurationMs / 2000) - (current.slowPhaseCount * 3), 0, 100)
    : 0;

  return {
    projectPath,
    runKind,
    scopePath: normalizeTelemetryPath(scopePath),
    focusPath: normalizeTelemetryPath(focusPath),
    capturedAt: current.capturedAt || null,
    current: currentSummary,
    trend,
    history: {
      total: Array.isArray(history.entries) ? history.entries.length : 0,
      latestCapturedAt: history.latest?.capturedAt || null,
      previousCapturedAt: history.previous?.capturedAt || null,
      baselineCapturedAt: history.baseline?.capturedAt || null
    },
    status: performanceState,
    performanceState,
    performanceScore: Number(performanceScore.toFixed(2)),
    summary: trend.summary || current.summaryText || null,
    oneLine: [
      `perf=${performanceState}`,
      `total=${Math.round(current.totalDurationMs || 0)}ms`,
      `slow=${current.slowPhaseCount || 0}/${current.phaseCount || 0}`
    ].join(' | ')
  };
}

export function summarizePipelineTimingTelemetry(summary = null) {
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  return {
    projectPath: summary.projectPath || null,
    runKind: summary.runKind || 'pipeline',
    scopePath: summary.scopePath || null,
    focusPath: summary.focusPath || null,
    capturedAt: summary.capturedAt || null,
    status: summary.status || summary.performanceState || null,
    performanceState: summary.performanceState || null,
    performanceScore: summary.performanceScore || 0,
    current: summary.current || null,
    trend: summary.trend || null,
    history: summary.history || null,
    summary: summary.summary || null,
    oneLine: summary.oneLine || null
  };
}

export default {
  evaluatePipelineTimingTelemetry,
  persistPipelineTimingTelemetry,
  buildPipelineTimingTelemetrySummary,
  summarizePipelineTimingTelemetry
};
