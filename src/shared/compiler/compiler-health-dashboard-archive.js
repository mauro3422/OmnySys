/**
 * Archive summary helpers for compiler health dashboards.
 */

import { asNumber } from './core-utils.js';

function mapArchiveDailySummary(daily = null) {
  if (!daily) {
    return null;
  }

  return {
    capturedAt: daily.capturedAt || null,
    globalHealthScore: asNumber(daily.globalHealthScore, asNumber(daily.healthScore, 0)),
    globalHealthGrade: daily.globalHealthGrade || daily.healthGrade || 'F',
    healthScore: asNumber(daily.healthScore, 0),
    healthGrade: daily.healthGrade || 'F',
    behaviorState: daily.behaviorState || null,
    driftState: daily.driftState || null,
    folderizationPropagation: daily.folderizationPropagation || null,
    successScore: asNumber(daily.successScore, 0),
    issueCount: asNumber(daily.issueCount, 0),
    summary: daily.summary || null
  };
}

function mapArchiveLifetimeSummary(lifetime = null) {
  if (!lifetime) {
    return null;
  }

  return {
    daysObserved: asNumber(lifetime.daysObserved, 0),
    snapshotsRecorded: asNumber(lifetime.snapshotsRecorded, 0),
    firstCapturedAt: lifetime.firstCapturedAt || null,
    lastCapturedAt: lifetime.lastCapturedAt || null,
    averageHealthScore: asNumber(lifetime.averageHealthScore, 0),
    averageDriftScore: asNumber(lifetime.averageDriftScore, 0),
    averageStabilityScore: asNumber(lifetime.averageStabilityScore, 0),
    averageSuccessScore: asNumber(lifetime.averageSuccessScore, 0),
    totalIssueCount: asNumber(lifetime.totalIssueCount, 0),
    totalWarningCount: asNumber(lifetime.totalWarningCount, 0),
    totalErrorCount: asNumber(lifetime.totalErrorCount, 0),
    totalWatcherAlertCount: asNumber(lifetime.totalWatcherAlertCount, 0),
    latestHealthScore: asNumber(lifetime.latestHealthScore, 0),
    latestHealthGrade: lifetime.latestHealthGrade || null,
    latestBehaviorState: lifetime.latestBehaviorState || null,
    latestClientSyncState: lifetime.latestClientSyncState || null,
    summary: lifetime.summary || null
  };
}

export function mapArchiveSummary(archive = null) {
  if (!archive) {
    return null;
  }

  const daily = archive.daily || null;
  const lifetime = archive.lifetime || archive;

  return {
    daily: mapArchiveDailySummary(daily),
    lifetime: mapArchiveLifetimeSummary(lifetime),
    summary: archive.summary || lifetime?.summary || null
  };
}

export default {
  mapArchiveSummary
};
