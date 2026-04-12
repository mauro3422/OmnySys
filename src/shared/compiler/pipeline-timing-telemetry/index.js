/**
 * @fileoverview Helpers for pipeline timing telemetry.
 */

import { createHash } from 'node:crypto';
import { asNumber, normalizeTelemetryPath } from '../core-utils.js';
import { clampScore } from '../../utils/normalize-helpers.js';

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

function parseTimingJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapTimingRowPayload(payload = {}) {
  const current = payload?.current || {};

  return {
    totalDurationMs: asNumber(current.totalDurationMs, 0),
    averagePhaseMs: asNumber(current.averagePhaseMs, 0),
    phaseCount: asNumber(current.phaseCount, 0),
    slowPhaseCount: asNumber(current.slowPhaseCount, 0),
    slowThresholdMs: asNumber(current.slowThresholdMs, 0),
    maxPhaseName: current.maxPhaseName || null,
    maxPhaseMs: asNumber(current.maxPhaseMs, 0),
    performanceState: current.performanceState || 'unknown',
    summaryText: current.summaryText || null,
    topSlowPhases: Array.isArray(current.topSlowPhases) ? current.topSlowPhases : [],
    phaseTimings: Array.isArray(current.phaseTimings) ? current.phaseTimings : []
  };
}

function summarizeTimingRow(row = null) {
  if (!row) {
    return null;
  }

  const payload = parseTimingJson(row.payload_json);
  const trend = parseTimingJson(row.trend_json);
  const timingPayload = mapTimingRowPayload(payload);

  return {
    capturedAt: row.captured_at || null,
    projectPath: row.project_path || null,
    runKind: payload?.runKind || row.snapshot_kind || 'pipeline-timing',
    scopePath: row.scope_path || null,
    focusPath: row.focus_path || null,
    ...timingPayload,
    summaryText: row.summary_text || timingPayload.summaryText || null,
    trend,
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

export {
  asNumber,
  buildPipelineTimingFingerprint,
  buildTimingTrend,
  clampScore,
  loadTimingHistory,
  normalizePhaseTimings,
  normalizeTelemetryPath,
  summarizePhaseTimings,
  summarizeTimingRow
};
