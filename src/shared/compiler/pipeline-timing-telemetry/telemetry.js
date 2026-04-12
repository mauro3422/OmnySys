/**
 * @fileoverview Pipeline timing telemetry helpers.
 *
 * Persists pipeline phase timings as historical snapshots so OmnySys can
 * detect performance regressions, slow phases and drift between runs.
 *
 * @module shared/compiler/pipeline-timing-telemetry
 */

import {
  asNumber,
  buildPipelineTimingFingerprint,
  buildTimingTrend,
  clampScore,
  loadTimingHistory,
  normalizePhaseTimings,
  normalizeTelemetryPath,
  summarizePhaseTimings
} from './index.js';

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
