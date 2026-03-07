import { getRecentLogs, clearRecentLogs } from '../../../utils/logger.js';
import {
  buildRestartLifecycleGuidance,
  buildTelemetryProvenance,
  classifySignalConfidence,
  summarizeCompilerDiagnostics,
  summarizeSignalConfidence,
  summarizeWatcherAlerts,
  summarizeWatcherAlertLifecycle
} from '../../../shared/compiler/index.js';
import { loadWatcherIssues } from '../../../core/file-watcher/watcher-issue-persistence.js';

function mapLoggerEntry(entry) {
  return {
    source: 'logger',
    level: entry.level,
    severity: entry.level === 'error' ? 'high' : (entry.level === 'warn' ? 'medium' : 'low'),
    message: entry.message,
    time: new Date(entry.time).toISOString()
  };
}

function buildNotificationsProvenance(watcherLifecycle, watcherEntries = []) {
  // Note: This function shares semantic fingerprint with buildTelemetryProvenance
  // Both implement 'build:core:provenance' - consider consolidation
  const restartGuidance = buildRestartLifecycleGuidance({
    proxyManaged: true,
    trueRestart: false,
    inProcessOnly: true
  });

  return {
    ...buildTelemetryProvenance({
      source: 'watcher+logger',
      watcherLifecycle,
      pendingRuntimeRestartFiles: [],
      runtimeRestartMode: 'manual'
    }),
    restartLifecycle: restartGuidance
  };
}

export async function collectRecentNotifications(projectPath, options = {}) {
  const {
    clearLoggerBuffer = true,
    watcherLimit = 10
  } = options;

  const rawLogs = typeof getRecentLogs === 'function' ? getRecentLogs() : [];
  if (clearLoggerBuffer && typeof clearRecentLogs === 'function') {
    clearRecentLogs();
  }

  const loggerEntries = rawLogs.map(mapLoggerEntry);
  const watcherResult = await loadWatcherIssues(projectPath, {
    limit: watcherLimit,
    offset: 0,
    lifecycle: 'all',
    pruneExpired: true
  });
  const watcherEntries = watcherResult.alerts;
  const watcherEntriesWithConfidence = watcherEntries.map((entry) => ({
    ...entry,
    confidence: classifySignalConfidence(entry)
  }));
  const watcherSummary = summarizeWatcherAlerts(watcherEntriesWithConfidence);
  const watcherLifecycle = summarizeWatcherAlertLifecycle(watcherEntriesWithConfidence);
  const compilerDiagnostics = summarizeCompilerDiagnostics(watcherEntriesWithConfidence);
  const signalConfidence = summarizeSignalConfidence(watcherEntriesWithConfidence);

  const warnings =
    loggerEntries.filter((entry) => entry.level === 'warn').length +
    watcherEntriesWithConfidence.filter((entry) => entry.severity === 'medium' || entry.severity === 'low').length;

  const errors =
    loggerEntries.filter((entry) => entry.level === 'error').length +
    watcherEntriesWithConfidence.filter((entry) => entry.severity === 'high').length;

  return {
    count: loggerEntries.length + watcherEntriesWithConfidence.length,
    warnings,
    errors,
    logs: loggerEntries,
    watcherAlerts: watcherEntriesWithConfidence,
    watcherSummary,
    compilerDiagnostics,
    signalConfidence,
    watcherLifecycle,
    watcherReconciliation: watcherResult.reconciliation,
    provenance: buildNotificationsProvenance(watcherLifecycle, watcherEntriesWithConfidence)
  };
}

export function normalizeRecentNotifications(notifications = {}) {
  const logs = Array.isArray(notifications.logs) ? notifications.logs : [];
  const watcherAlerts = Array.isArray(notifications.watcherAlerts) ? notifications.watcherAlerts : [];

  return {
    count: notifications.count || (logs.length + watcherAlerts.length),
    warnings: notifications.warnings || 0,
    errors: notifications.errors || 0,
    logs,
    watcherAlerts,
    watcherSummary: notifications.watcherSummary || summarizeWatcherAlerts(watcherAlerts),
    compilerDiagnostics: notifications.compilerDiagnostics || summarizeCompilerDiagnostics(watcherAlerts),
    signalConfidence: notifications.signalConfidence || summarizeSignalConfidence(watcherAlerts),
    watcherLifecycle: notifications.watcherLifecycle || summarizeWatcherAlertLifecycle(watcherAlerts),
    watcherReconciliation: notifications.watcherReconciliation || { deletedExpired: 0, summary: { total: watcherAlerts.length, byStatus: {} } },
    provenance: notifications.provenance || buildNotificationsProvenance(
      notifications.watcherLifecycle || summarizeWatcherAlertLifecycle(watcherAlerts),
      watcherAlerts
    )
  };
}
// Force reindex: 1430014351
// Trigger reindex: 1696058712
// Test conceptual duplicate detection: 723619026
// Debug: 841588844
// Test after fix: 1345224501
