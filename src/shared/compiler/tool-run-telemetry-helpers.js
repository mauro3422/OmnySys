/**
 * @fileoverview Helper normalizers for tool run telemetry.
 */

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTelemetryPath(value = '') {
  if (!value) {
    return null;
  }

  return String(value).replaceAll('\\', '/');
}

function safeJsonStringify(value) {
  const seen = new WeakSet();

  return JSON.stringify(value, (key, currentValue) => {
    if (typeof currentValue === 'bigint') {
      return Number(currentValue);
    }

    if (currentValue instanceof Error) {
      return {
        name: currentValue.name,
        message: currentValue.message,
        stack: currentValue.stack
      };
    }

    if (currentValue instanceof Map) {
      return Object.fromEntries(currentValue.entries());
    }

    if (currentValue instanceof Set) {
      return Array.from(currentValue.values());
    }

    if (typeof currentValue === 'function') {
      return `[Function ${currentValue.name || 'anonymous'}]`;
    }

    if (currentValue && typeof currentValue === 'object') {
      if (seen.has(currentValue)) {
        return '[Circular]';
      }

      seen.add(currentValue);
    }

    return currentValue;
  });
}

function compactSnapshotForStorage(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  const current = snapshot.current || {};
  const trend = snapshot.trend || {};

  return {
    summary: snapshot.summary || null,
    current: {
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
    },
    trend: {
      status: trend.status || null,
      progressScore: asNumber(trend.progressScore, 0),
      velocityPerDay: asNumber(trend.velocityPerDay, 0),
      summary: trend.summary || null
    }
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

function classifyTelemetryRepair(before = {}, after = {}, success = true, deltas = {}) {
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

  const hadPressure = before.watcherAlertCount > 0 || before.recentErrorCount > 0 || before.issueCount > 0 || before.driftScore > 0;
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
