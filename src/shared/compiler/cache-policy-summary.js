/**
 * Cache policy advisor for MCP status output.
 *
 * This is intentionally heuristic: it surfaces where caching helps most,
 * where freshness matters, and which snapshots should be keyed by fingerprint.
 */

import { asNumber } from './core-utils.js';
import { takeSample } from './sample-helpers.js';
import {
  buildRecurringHotspots,
  buildWhereNotToCache,
  buildWhereToCache,
  summarizeRecentErrors,
  summarizeToolTelemetry
} from './cache-policy-summary-helpers.js';

export function buildCachePolicySummary({
  recentErrors = null,
  databaseHealth = null,
  metricsSnapshot = null,
  toolInventory = null,
  watcher = null,
  mcpSessions = null
} = {}) {
  const current = metricsSnapshot?.current || {};
  const daily = metricsSnapshot?.daily || null;
  const lifetime = metricsSnapshot?.lifetime || null;
  const toolTelemetry = summarizeToolTelemetry(current.toolTelemetry);
  const recentErrorsSummary = summarizeRecentErrors(recentErrors);
  const healthScore = asNumber(databaseHealth?.healthScore, asNumber(current.healthScore, 0));
  const hotPathDetected = asNumber(current.recentErrorCount, 0) > 0
    || asNumber(current.watcherAlertCount, 0) > 0
    || asNumber(current.phase2PendingFiles, 0) > 0
    || asNumber(toolTelemetry?.thrashingRuns, 0) > 0
    || asNumber(toolTelemetry?.averageDurationMs, 0) > 5000
    || asNumber(toolTelemetry?.pressureRuns, 0) > 0
    || asNumber(toolTelemetry?.noiseSummary?.noiseScore, 0) >= 35;
  const stableSnapshot = !!metricsSnapshot?.current?.snapshotFingerprint
    && asNumber(current.phase2PendingFiles, 0) === 0
    && asNumber(current.recentErrorCount, 0) === 0
    && asNumber(current.watcherAlertCount, 0) === 0
    && asNumber(toolTelemetry?.thrashingRuns, 0) === 0
    && asNumber(toolTelemetry?.averageDurationMs, 0) <= 5000
    && asNumber(toolTelemetry?.noiseSummary?.noiseScore, 0) < 35;

  const whereToCache = buildWhereToCache({
    current,
    daily,
    lifetime,
    toolTelemetry,
    stableSnapshot
  });
  const whereNotToCache = buildWhereNotToCache();
  const recurringHotspots = buildRecurringHotspots({
    recentErrors: recentErrorsSummary,
    watcher,
    toolTelemetry
  });
  const cacheDecision = stableSnapshot
    ? 'snapshot-led'
    : hotPathDetected
      ? 'freshness-first'
      : 'hybrid';

  return {
    summary: stableSnapshot
      ? 'Cache fingerprinted snapshots and daily archives aggressively, keep live DB reads fresh, and let tool-thrash force short TTLs.'
      : 'Use short TTLs until the runtime settles; Cache fingerprinted snapshots and daily archives first because they are still the safest place for reuse.',
    why: stableSnapshot
      ? 'Fingerprint-led surfaces are stable enough to reuse while live reads, alerts and drift gates remain uncached.'
      : 'The runtime still has pressure signals, so Fingerprint-led surfaces should stay preferred while live-derived surfaces are reused cautiously.',
    decision: cacheDecision,
    confidence: stableSnapshot ? 'high' : hotPathDetected ? 'medium' : 'medium',
    stableSnapshot,
    hotPathDetected,
    recurringHotspots,
    recommendedLayers: [
      'persistent-daily',
      'persistent-snapshot',
      'process-memory',
      'live-read'
    ],
    storagePlacement: [
      {
        layer: 'persistent-daily',
        location: '.omnysysdata/health-history.db',
        purpose: 'daily and lifetime snapshots',
        note: 'Survives reindex/reanalyze and stores the longitudinal DNA of the system.'
      },
      {
        layer: 'persistent-snapshot',
        location: 'compiler_metrics_snapshots',
        purpose: 'fingerprint keyed derived reports',
        note: 'Best place for technical debt, folderization, and other derived scans.'
      },
      {
        layer: 'process-memory',
        location: 'in-memory TTL',
        purpose: 'status polling and tool inventory',
        note: 'Cheap, short-lived cache for UI surfaces that are safe to refresh often.'
      },
      {
        layer: 'live-read',
        location: 'canonical DB tables',
        purpose: 'freshness gates and direct health reads',
        note: 'Do not long-cache database health or direct read gates.'
      }
    ],
    whereToCache,
    whereNotToCache,
    targets: whereToCache,
    signals: {
      recentErrors: recentErrorsSummary,
      databaseHealth: {
        healthy: databaseHealth?.healthy === true,
        healthScore,
        grade: databaseHealth?.grade || null
      },
      metrics: {
        snapshotFingerprint: metricsSnapshot?.current?.snapshotFingerprint || null,
        behaviorState: current.behaviorState || null,
        clientSyncState: current.clientSyncState || null,
        phase2PendingFiles: asNumber(current.phase2PendingFiles, 0),
        watcherAlertCount: asNumber(current.watcherAlertCount, 0),
        recentErrorCount: asNumber(current.recentErrorCount, 0),
        namingDebt: asNumber(current.namingDebt, 0),
        structuralGroups: asNumber(current.structuralGroups, 0),
        conceptualGroups: asNumber(current.conceptualGroups, 0),
        toolTelemetry
      },
      toolInventory: toolInventory ? {
        totalTools: toolInventory.totalTools || 0,
        dominantCategory: toolInventory.dominantCategory?.category || toolInventory.dominantCategory || null,
        concentration: toolInventory.concentration || 0,
        recommendations: takeSample(toolInventory.recommendations || [], 2)
      } : null,
      watcher: watcher ? {
        isRunning: watcher.isRunning !== false,
        pendingChanges: watcher.pendingChanges || 0,
        failedChanges: watcher.failedChanges || 0,
        lastChangeOrigin: watcher.lastChangeOrigin || null
      } : null,
      mcpSessions: mcpSessions ? {
        totalPersistentActive: mcpSessions.totalPersistentActive || 0,
        totalPersistent: mcpSessions.totalPersistent || 0,
        uniqueClients: mcpSessions.uniqueClients || 0,
        clientSyncState: mcpSessions.clientSyncState || null
      } : null,
      recurringHotspots,
      archive: daily || lifetime ? {
        daily: daily ? {
          healthScore: daily.healthScore || 0,
          healthGrade: daily.healthGrade || null,
          driftScore: daily.driftScore || 0,
          behaviorState: daily.behaviorState || null,
          clientSyncState: daily.clientSyncState || null
        } : null,
        lifetime: lifetime ? {
          daysObserved: lifetime.daysObserved || 0,
          snapshotsRecorded: lifetime.snapshotsRecorded || 0,
          averageHealthScore: lifetime.averageHealthScore || 0,
          averageDriftScore: lifetime.averageDriftScore || 0,
          averageSuccessScore: lifetime.averageSuccessScore || 0
        } : null
      } : null
    }
  };
}

export default {
  buildCachePolicySummary
};
