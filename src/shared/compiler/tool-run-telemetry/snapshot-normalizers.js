import { asNumber } from '../core-utils.js';

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

export {
  mapSnapshotCurrentForStorage,
  mapSnapshotTrendForStorage,
  compactSnapshotForStorage,
  compactNotificationsForStorage,
  summarizeSnapshotCounts
};
