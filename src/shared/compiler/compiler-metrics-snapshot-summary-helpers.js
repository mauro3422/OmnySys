/**
 * Helpers for compiler metrics snapshot summary assembly.
 */

export function buildMetricsSnapshotDaily(snapshot = {}, current = null) {
  if (!current) {
    return null;
  }

  return {
    capturedAt: current.capturedAt || null,
    globalHealthScore: current.globalHealthScore || current.healthScore || 0,
    globalHealthGrade: current.globalHealthGrade || current.healthGrade || 'F',
    healthScore: current.healthScore || 0,
    healthGrade: current.healthGrade || 'F',
    driftState: current.driftState || null,
    driftScore: current.driftScore || 0,
    stabilityScore: current.stabilityScore || 0,
    successScore: current.successScore || 0,
    behaviorState: current.behaviorState || null,
    clientSyncState: current.clientSyncState || null,
    normalization: current.folderizationNormalization || null,
    propagation: current.folderizationPropagation || null,
    canonicalPromotion: current.canonicalPromotion || null,
    issueCount: current.issueCount || 0,
    summary: snapshot.summary || current.summaryText || null
  };
}

export function buildMetricsSnapshotLifetime(archiveSource = null) {
  if (!archiveSource) {
    return null;
  }

  return {
    daysObserved: archiveSource.daysObserved || 0,
    snapshotsRecorded: archiveSource.snapshotsRecorded || 0,
    firstCapturedAt: archiveSource.firstCapturedAt || null,
    lastCapturedAt: archiveSource.lastCapturedAt || null,
    averageHealthScore: archiveSource.averageHealthScore || 0,
    averageDriftScore: archiveSource.averageDriftScore || 0,
    averageStabilityScore: archiveSource.averageStabilityScore || 0,
    averageSuccessScore: archiveSource.averageSuccessScore || 0,
    totalIssueCount: archiveSource.totalIssueCount || 0,
    totalWarningCount: archiveSource.totalWarningCount || 0,
    totalErrorCount: archiveSource.totalErrorCount || 0,
    totalWatcherAlertCount: archiveSource.totalWatcherAlertCount || 0,
    latestHealthScore: archiveSource.latestHealthScore || 0,
    latestHealthGrade: archiveSource.latestHealthGrade || null,
    latestBehaviorState: archiveSource.latestBehaviorState || null,
    latestClientSyncState: archiveSource.latestClientSyncState || null,
    summary: archiveSource.summary || null
  };
}

export function buildMetricsSnapshotIdentity(snapshot = {}, current = null) {
  return {
    projectPath: snapshot.projectPath || null,
    scopePath: snapshot.scopePath || null,
    focusPath: snapshot.focusPath || null,
    snapshotKind: snapshot.snapshotKind || 'status',
    captureSource: snapshot.captureSource || null,
    capturedAt: current?.capturedAt || null
  };
}

export default {
  buildMetricsSnapshotDaily,
  buildMetricsSnapshotLifetime,
  buildMetricsSnapshotIdentity
};
