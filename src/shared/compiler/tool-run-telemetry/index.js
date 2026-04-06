/**
 * @fileoverview Helper normalizers for tool run telemetry.
 */

import { safeJsonStringify } from '../safe-json.js';
import { asNumber, normalizeTelemetryPath } from '../core-utils.js';

function mapSnapshotCurrentForStorage(current = {}) {
  return {
    capturedAt: current.capturedAt || null,
    globalHealthScore: asNumber(current.globalHealthScore, 0),
    globalHealthGrade: current.globalHealthGrade || null,
    healthScore: asNumber(current.healthScore, 0),
    healthGrade: current.healthGrade || null,
    reliabilityScore: asNumber(current.reliabilityScore, 0),
    reliabilityGrade: current.reliabilityGrade || null,
    issueCount: asNumber(current.issueCount, 0),
    structuralGroups: asNumber(current.structuralGroups, 0),
    conceptualGroups: asNumber(current.conceptualGroups, 0),
    pipelineOrphans: asNumber(current.pipelineOrphans, 0),
    watcherAlertCount: asNumber(current.watcherAlertCount, 0),
    recentWarningCount: asNumber(current.recentWarningCount, 0),
    recentErrorCount: asNumber(current.recentErrorCount, 0),
    driftScore: asNumber(current.driftScore, 0),
    stabilityScore: asNumber(current.stabilityScore, 0),
    successScore: asNumber(current.successScore, 0),
    successThreshold: asNumber(current.successThreshold, 0),
    mvpReady: current.mvpReady === true,
    behaviorState: current.behaviorState || null,
    readinessReason: current.readinessReason || null,
    clientSyncState: current.clientSyncState || null,
    activeAtomsDriftState: current.activeAtomsDriftState || null
  };
}

function mapSnapshotTrendForStorage(trend = {}) {
  return {
    status: trend.status || null,
    progressScore: asNumber(trend.progressScore, 0),
    velocityPerDay: asNumber(trend.velocityPerDay, 0),
    summary: trend.summary || null
  };
}

function compactSnapshotForStorage(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  return {
    summary: snapshot.summary || null,
    current: mapSnapshotCurrentForStorage(snapshot.current || {}),
    trend: mapSnapshotTrendForStorage(snapshot.trend || {})
  };
}

function compactNotificationsForStorage(notifications = null) {
  if (!notifications || typeof notifications !== 'object') {
    return null;
  }

  return {
    count: asNumber(notifications.count, 0),
    warnings: asNumber(notifications.warnings, 0),
    errors: asNumber(notifications.errors, 0),
    watcherSummary: notifications.watcherSummary || null,
    compilerDiagnostics: notifications.compilerDiagnostics || null,
    signalConfidence: notifications.signalConfidence || null,
    watcherLifecycle: notifications.watcherLifecycle || null,
    provenance: notifications.provenance || null
  };
}

function summarizeSnapshotCounts(snapshot = null) {
  const current = snapshot?.current || {};
  return {
    healthScore: asNumber(current.healthScore, 0),
    issueCount: asNumber(current.issueCount, 0),
    structuralGroups: asNumber(current.structuralGroups, 0),
    conceptualGroups: asNumber(current.conceptualGroups, 0),
    pipelineOrphans: asNumber(current.pipelineOrphans, 0),
    watcherAlertCount: asNumber(current.watcherAlertCount, 0),
    recentWarningCount: asNumber(current.recentWarningCount, 0),
    recentErrorCount: asNumber(current.recentErrorCount, 0),
    driftScore: asNumber(current.driftScore, 0),
    stabilityScore: asNumber(current.stabilityScore, 0),
    successScore: asNumber(current.successScore, 0),
    mvpReady: current.mvpReady === true,
    behaviorState: current.behaviorState || null,
    readinessReason: current.readinessReason || null,
    summary: snapshot?.summary || null,
    capturedAt: current.capturedAt || null
  };
}

function computeTelemetryDeltas(before = {}, after = {}) {
  const alertClearance = before.watcherAlertCount - after.watcherAlertCount;
  const errorClearance = before.recentErrorCount - after.recentErrorCount;
  const warningClearance = before.recentWarningCount - after.recentWarningCount;
  const issueClearance = before.issueCount - after.issueCount;
  const structuralClearance = before.structuralGroups - after.structuralGroups;
  const conceptualClearance = before.conceptualGroups - after.conceptualGroups;
  const orphanClearance = before.pipelineOrphans - after.pipelineOrphans;
  const driftClearance = before.driftScore - after.driftScore;
  const successDelta = after.successScore - before.successScore;

  return {
    alertClearance,
    errorClearance,
    warningClearance,
    issueClearance,
    structuralClearance,
    conceptualClearance,
    orphanClearance,
    driftClearance,
    successDelta,
    repairScore: Number((
      successDelta +
      (alertClearance * 2) +
      (errorClearance * 4) +
      (warningClearance * 1) +
      (issueClearance * 0.5) +
      (structuralClearance * 1.5) +
      (conceptualClearance * 1.5) +
      (orphanClearance * 2) +
      (driftClearance * 0.5)
    ).toFixed(2))
  };
}

export function normalizeToolName(toolName) {
  return typeof toolName === 'string' ? toolName.trim().toLowerCase() : '';
}

export function isObservationOnlyTool(toolName, captureSource = '') {
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

export function classifyToolTelemetryNoise(toolStats = {}, context = {}) {
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

export function buildToolTelemetryNoiseSummary(toolRows = [], totals = {}) {
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

export function classifyToolCacheTier(toolStats = {}, context = {}) {
  const toolName = normalizeToolName(toolStats.toolName || toolStats.tool_name || context.toolName || '');
  const observationOnly = isObservationOnlyTool(toolName, toolStats.captureSource || context.captureSource || '');
  const noiseScore = asNumber(toolStats.noiseScore ?? toolStats.noiseSummary?.noiseScore, 0);
  const avgDurationMs = asNumber(toolStats.avgDurationMs ?? toolStats.averageDurationMs ?? toolStats.avg_duration_ms, 0);
  const thrashingCount = asNumber(toolStats.thrashingCount ?? toolStats.thrashingRuns ?? toolStats.thrashing_runs, 0);
  const repairedCount = asNumber(toolStats.repairedCount ?? toolStats.repairedRuns ?? toolStats.repaired_runs, 0);
  const reason = [];

  const isMutationTool = /^(mcp_omnysystem_(restart|atomic_|move_|rename_|split_|folderize_|fix_|validate_imports|validate_exports|save_|repair_|update_|apply_))/i.test(toolName)
    || /(restart|mutation|repair|move|rename|split|folderize|write|save|apply)/i.test(toolName);
  const isMetricsFingerprintTool = /^(mcp_omnysystem_get_metrics_snapshot)$/i.test(toolName);
  const isLiveGateTool = /^(mcp_omnysystem_(execute_sql|get_server_status|get_recent_errors|get_health_snapshot))/i.test(toolName);
  const isHeavyDerivedTool = /^(mcp_omnysystem_(query_graph|traverse_graph|aggregate_metrics|get_technical_debt_report|diagnose_tool_health|check_pipeline_integrity|get_folderization_snapshot|get_update_surface_snapshot))/i.test(toolName);
  const isSnapshotSummaryTool = /^(mcp_omnysystem_(get_health_snapshot|get_server_status|get_recent_errors|status))/i.test(toolName)
    || /(summary|dashboard|snapshot|status)/i.test(toolName);

  if (isMutationTool) {
    reason.push('mutating-or-side-effect');
    return {
      toolName,
      tier: 'live',
      reasons: reason,
      invalidateOn: [
        'any file or DB write',
        'reindex / live-row reconciliation',
        'restart or hot-reload'
      ]
    };
  }

  if (isLiveGateTool) {
    reason.push('freshness-gate');
    return {
      toolName,
      tier: 'live',
      reasons: reason,
      invalidateOn: [
        'any write',
        'watcher event',
        'session sync change'
      ]
    };
  }

  if (isMetricsFingerprintTool) {
    reason.push('snapshot-fingerprint');
    if (avgDurationMs >= 5000) {
      reason.push('slow');
    }
    if (noiseScore >= 35) {
      reason.push('noisy');
    }
    return {
      toolName,
      tier: 'fingerprint-cache',
      reasons: reason,
      invalidateOn: [
        'snapshotFingerprint change',
        'graph / metadata refresh',
        'windowDays change'
      ]
    };
  }

  if (isHeavyDerivedTool) {
    reason.push('heavy-derived');
    if (noiseScore >= 35 || avgDurationMs >= 5000 || thrashingCount > 0) {
      reason.push('expensive-or-noisy');
    }
    return {
      toolName,
      tier: 'fingerprint-cache',
      reasons: reason,
      invalidateOn: [
        'snapshotFingerprint change',
        'graph / metadata refresh',
        'windowDays change'
      ]
    };
  }

  if (isSnapshotSummaryTool || observationOnly) {
    reason.push('observability-summary');
    if (avgDurationMs >= 5000) {
      reason.push('slow');
    }
    if (noiseScore >= 35) {
      reason.push('noisy');
    }
    if (repairedCount > 0 || thrashingCount > 0) {
      reason.push('repair-loop');
    }
    return {
      toolName,
      tier: 'ttl-cache',
      reasons: reason,
      invalidateOn: [
        'recent error / watcher change',
        'session sync change',
        'hot-reload restart'
      ]
    };
  }

  return {
    toolName,
    tier: 'snapshot-cache',
    reasons: ['default-snapshot-derived'],
    invalidateOn: [
      'snapshotFingerprint change',
      'state snapshot update'
    ]
  };
}

export function buildToolCachePolicySummary(toolRows = [], totals = {}) {
  const classified = Array.isArray(toolRows)
    ? toolRows.map((row) => {
      const cache = classifyToolCacheTier(row, totals);
      return {
        toolName: row.toolName || row.tool_name || null,
        runCount: asNumber(row.runCount ?? row.run_count, 0),
        successRate: asNumber(row.successRate, 0),
        avgDurationMs: asNumber(row.avgDurationMs ?? row.avg_duration_ms, 0),
        avgRepairScore: asNumber(row.avgRepairScore ?? row.avg_repair_score, 0),
        noiseScore: asNumber(row.noiseScore ?? row.noiseSummary?.noiseScore, 0),
        cacheTier: cache.tier,
        cacheReasons: cache.reasons,
        invalidateOn: cache.invalidateOn
      };
    })
    : [];

  const tierCounts = classified.reduce((acc, row) => {
    acc[row.cacheTier] = (acc[row.cacheTier] || 0) + asNumber(row.runCount, 0);
    return acc;
  }, { live: 0, 'fingerprint-cache': 0, 'snapshot-cache': 0, 'ttl-cache': 0 });

  const topByCost = classified
    .slice()
    .sort((left, right) => {
      const rightScore = asNumber(right.noiseScore, 0) + (asNumber(right.avgDurationMs, 0) / 1000);
      const leftScore = asNumber(left.noiseScore, 0) + (asNumber(left.avgDurationMs, 0) / 1000);
      if (rightScore !== leftScore) return rightScore - leftScore;
      return asNumber(right.runCount, 0) - asNumber(left.runCount, 0);
    })
    .slice(0, 5);

  return {
    totalTools: classified.length,
    tierCounts: {
      live: tierCounts.live || 0,
      fingerprintCache: tierCounts['fingerprint-cache'] || 0,
      snapshotCache: tierCounts['snapshot-cache'] || 0,
      ttlCache: tierCounts['ttl-cache'] || 0
    },
    topTools: topByCost,
    defaultPolicy: {
      live: ['mutating tools', 'freshness gates'],
      fingerprintCache: ['heavy derived graph/debt/pipeline summaries'],
      snapshotCache: ['stable derived snapshots and daily archives'],
      ttlCache: ['status / health / error polling']
    }
  };
}

function classifyTelemetryRepair(before = {}, after = {}, success = true, deltas = {}, context = {}) {
  const {
    alertClearance,
    errorClearance,
    warningClearance,
    issueClearance,
    structuralClearance,
    conceptualClearance,
    orphanClearance,
    driftClearance,
    successDelta,
    repairScore
  } = deltas;

  const observationOnly = isObservationOnlyTool(context?.toolName, context?.captureSource);
  const hadPressure = !observationOnly && (
    before.watcherAlertCount > 0 ||
    before.recentErrorCount > 0 ||
    before.issueCount > 0 ||
    before.driftScore > 0
  );
  const repaired = success && hadPressure && (
    alertClearance > 0 ||
    errorClearance > 0 ||
    warningClearance > 0 ||
    issueClearance > 0 ||
    structuralClearance > 0 ||
    conceptualClearance > 0 ||
    orphanClearance > 0 ||
    driftClearance > 0 ||
    successDelta > 0
  );
  const thrashing = success && hadPressure && (
    (after.watcherAlertCount >= before.watcherAlertCount && after.recentErrorCount >= before.recentErrorCount) ||
    successDelta < 0
  ) && !repaired;

  return {
    hadPressure,
    repaired,
    thrashing,
    repairStatus: !success
      ? 'failed'
      : repaired
        ? 'repaired'
        : thrashing
          ? 'thrashing'
          : 'stable',
    repairScore,
    successThresholdMet: after.mvpReady === true
  };
}

function buildToolRunPersistencePayload(run = {}) {
  return {
    before_snapshot_json: safeJsonStringify(compactSnapshotForStorage(run.beforeSnapshot)),
    after_snapshot_json: safeJsonStringify(compactSnapshotForStorage(run.afterSnapshot)),
    before_notifications_json: safeJsonStringify(compactNotificationsForStorage(run.beforeNotifications)),
    after_notifications_json: safeJsonStringify(compactNotificationsForStorage(run.afterNotifications)),
    delta_json: safeJsonStringify(run.deltas || {}),
    args_json: safeJsonStringify(run.args || null)
  };
}

function buildToolRunPersistenceArgs(run = {}) {
  const payload = buildToolRunPersistencePayload(run);

  return {
    project_path: run.projectPath || null,
    tool_name: run.toolName || null,
    scope_path: run.scopePath || null,
    focus_path: run.focusPath || null,
    capture_source: run.captureSource || 'mcp.tool',
    transport_origin: run.transportOrigin || 'unknown',
    started_at: run.startedAt || new Date().toISOString(),
    ended_at: run.endedAt || new Date().toISOString(),
    duration_ms: asNumber(run.durationMs, 0),
    success: run.success === true ? 1 : 0,
    error_message: run.errorMessage || null,
    repair_status: run.repairStatus || null,
    repair_score: asNumber(run.repairScore, 0),
    before_watcher_alert_count: asNumber(run.beforeWatcherAlertCount, 0),
    after_watcher_alert_count: asNumber(run.afterWatcherAlertCount, 0),
    before_recent_warning_count: asNumber(run.beforeRecentWarningCount, 0),
    after_recent_warning_count: asNumber(run.afterRecentWarningCount, 0),
    before_recent_error_count: asNumber(run.beforeRecentErrorCount, 0),
    after_recent_error_count: asNumber(run.afterRecentErrorCount, 0),
    alert_clearance: asNumber(run.alertClearance, 0),
    error_clearance: asNumber(run.errorClearance, 0),
    warning_clearance: asNumber(run.warningClearance, 0),
    snapshot_fingerprint: run.fingerprint || null,
    ...payload
  };
}

export {
  asNumber,
  buildToolRunPersistenceArgs,
  compactNotificationsForStorage,
  compactSnapshotForStorage,
  computeTelemetryDeltas,
  classifyTelemetryRepair,
  normalizeTelemetryPath,
  safeJsonStringify,
  summarizeSnapshotCounts
};
