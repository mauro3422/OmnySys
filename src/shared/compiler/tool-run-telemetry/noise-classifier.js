import { asNumber } from '../core-utils.js';

function normalizeToolName(toolName) {
  return typeof toolName === 'string' ? toolName.trim().toLowerCase() : '';
}

function isObservationOnlyTool(toolName, captureSource = '') {
  const normalized = normalizeToolName(toolName);
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith('mcp_omnysystem_get_') || normalized.startsWith('mcp_omnysystem_list_')) {
    return true;
  }

  if (normalized.startsWith('mcp_omnysystem_query_') || normalized.startsWith('mcp_omnysystem_traverse_')) {
    return true;
  }

  if (normalized === 'mcp_omnysystem_aggregate_metrics' || normalized === 'mcp_omnysystem_execute_sql') {
    return true;
  }

  if (normalized.startsWith('mcp_omnysystem_check_') || normalized.startsWith('mcp_omnysystem_diagnose_')) {
    return true;
  }

  return captureSource === 'mcp.tool.observe';
}

function classifyToolTelemetryNoise(toolStats = {}, context = {}) {
  const toolName = toolStats.toolName || toolStats.tool_name || context.toolName || null;
  const runCount = asNumber(toolStats.runCount ?? toolStats.totalRuns ?? toolStats.run_count, 0);
  const successCount = asNumber(toolStats.successCount ?? toolStats.successfulRuns ?? toolStats.success_count, 0);
  const repairedCount = asNumber(toolStats.repairedCount ?? toolStats.repairedRuns ?? toolStats.repaired_runs, 0);
  const thrashingCount = asNumber(toolStats.thrashingCount ?? toolStats.thrashingRuns ?? toolStats.thrashing_runs, 0);
  const stableCount = asNumber(toolStats.stableCount ?? toolStats.stableRuns ?? toolStats.stable_runs, 0);
  const pressureCount = asNumber(toolStats.pressureCount ?? toolStats.pressureRuns ?? toolStats.pressure_runs, 0);
  const observationCount = asNumber(toolStats.observationCount ?? toolStats.observationRuns ?? toolStats.observation_runs, 0);
  const clearanceCount = asNumber(toolStats.clearanceCount ?? toolStats.clearanceRuns ?? toolStats.clearance_runs, 0);
  const avgDurationMs = asNumber(toolStats.avgDurationMs ?? toolStats.averageDurationMs ?? toolStats.avg_duration_ms, 0);
  const avgRepairScore = asNumber(toolStats.avgRepairScore ?? toolStats.averageRepairScore ?? toolStats.avg_repair_score, 0);
  const successRate = runCount > 0 ? Number((successCount / runCount).toFixed(2)) : 0;
  const thrashRate = runCount > 0 ? Number((thrashingCount / runCount).toFixed(2)) : 0;
  const pressureRate = runCount > 0 ? Number((pressureCount / runCount).toFixed(2)) : 0;
  const clearanceRate = runCount > 0 ? Number((clearanceCount / runCount).toFixed(2)) : 0;
  const observationRate = runCount > 0 ? Number((observationCount / runCount).toFixed(2)) : 0;
  const observationOnly = isObservationOnlyTool(toolName, toolStats.captureSource || context.captureSource || '');
  const reasons = [];
  let noiseScore = 0;

  if (observationOnly) {
    reasons.push('observation-only');
    noiseScore += 15;
  }

  if (avgDurationMs >= 5000) {
    reasons.push(avgDurationMs >= 10000 ? 'slow-critical' : 'slow');
    noiseScore += Math.min(30, Math.round(avgDurationMs / 500));
  }

  if (thrashingCount >= 3 || thrashRate >= 0.25) {
    reasons.push('thrashing');
    noiseScore += Math.min(35, Math.round((thrashingCount * 7) + (thrashRate * 20)));
  }

  if (pressureCount > 0 && repairedCount === 0) {
    reasons.push('pressure-without-repair');
    noiseScore += Math.min(15, pressureCount * 3);
  }

  if (observationOnly && runCount >= 10 && clearanceCount === 0) {
    reasons.push('polling-no-clearance');
    noiseScore += 10;
  }

  if (observationOnly && observationRate >= 0.8 && avgDurationMs >= 5000) {
    reasons.push('slow-observation');
    noiseScore += 5;
  }

  if (runCount >= 20 && successRate >= 0.95 && clearanceCount === 0 && (observationOnly || thrashingCount > 0)) {
    reasons.push('high-frequency-polling');
    noiseScore += 8;
  }

  if (avgRepairScore < 0 && thrashingCount > 0) {
    reasons.push('negative-repair-yield');
    noiseScore += 8;
  }

  const dedupedReasons = Array.from(new Set(reasons));
  const level = noiseScore >= 65
    ? 'high'
    : noiseScore >= 35
      ? 'medium'
      : noiseScore >= 15
        ? 'low'
        : 'none';

  return {
    toolName,
    runCount,
    successCount,
    successRate,
    repairedCount,
    thrashingCount,
    thrashRate,
    stableCount,
    pressureCount,
    pressureRate,
    observationCount,
    observationRate,
    clearanceCount,
    clearanceRate,
    avgDurationMs,
    avgRepairScore,
    observationOnly,
    noiseScore,
    noiseLevel: level,
    noiseReasons: dedupedReasons
  };
}

function buildToolTelemetryNoiseSummary(toolRows = [], totals = {}) {
  const classified = Array.isArray(toolRows)
    ? toolRows.map((row) => classifyToolTelemetryNoise(row))
    : [];
  const totalRuns = asNumber(totals.totalRuns, classified.reduce((sum, row) => sum + asNumber(row.runCount, 0), 0));
  const noisyRows = classified.filter((row) => row.noiseLevel !== 'none');
  const noisyRunCount = noisyRows.reduce((sum, row) => sum + asNumber(row.runCount, 0), 0);
  const weightedNoiseScore = totalRuns > 0
    ? classified.reduce((sum, row) => sum + (asNumber(row.noiseScore, 0) * asNumber(row.runCount, 0)), 0) / totalRuns
    : 0;
  const reasonCounts = new Map();

  for (const row of noisyRows) {
    for (const reason of row.noiseReasons || []) {
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + asNumber(row.runCount, 0));
    }
  }

  const noiseTopTools = noisyRows
    .slice()
    .sort((left, right) => {
      const scoreDelta = asNumber(right.noiseScore, 0) - asNumber(left.noiseScore, 0);
      if (scoreDelta !== 0) return scoreDelta;
      const runDelta = asNumber(right.runCount, 0) - asNumber(left.runCount, 0);
      if (runDelta !== 0) return runDelta;
      return String(left.toolName || '').localeCompare(String(right.toolName || ''));
    })
    .slice(0, 5)
    .map((row) => ({
      toolName: row.toolName || null,
      runCount: asNumber(row.runCount, 0),
      successRate: asNumber(row.successRate, 0),
      thrashingCount: asNumber(row.thrashingCount, 0),
      pressureCount: asNumber(row.pressureCount, 0),
      avgDurationMs: asNumber(row.avgDurationMs, 0),
      avgRepairScore: asNumber(row.avgRepairScore, 0),
      noiseScore: asNumber(row.noiseScore, 0),
      noiseLevel: row.noiseLevel || 'none',
      noiseReasons: Array.isArray(row.noiseReasons) ? row.noiseReasons.slice(0, 5) : []
    }));

  return {
    totalRuns,
    noisyRunCount,
    noisyToolCount: noisyRows.length,
    noiseRate: totalRuns > 0 ? Number((noisyRunCount / totalRuns).toFixed(2)) : 0,
    noiseScore: Number(weightedNoiseScore.toFixed(2)),
    noiseTopTools,
    topReasons: Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)
  };
}

export {
  normalizeToolName,
  isObservationOnlyTool,
  classifyToolTelemetryNoise,
  buildToolTelemetryNoiseSummary
};
