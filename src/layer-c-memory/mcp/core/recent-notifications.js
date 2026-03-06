import { getRecentLogs, clearRecentLogs } from '../../../utils/logger.js';
import {
  summarizeCompilerDiagnostics,
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
  const watcherSummary = summarizeWatcherAlerts(watcherEntries);
  const watcherLifecycle = summarizeWatcherAlertLifecycle(watcherEntries);
  const compilerDiagnostics = summarizeCompilerDiagnostics(watcherEntries);

  const warnings =
    loggerEntries.filter((entry) => entry.level === 'warn').length +
    watcherEntries.filter((entry) => entry.severity === 'medium' || entry.severity === 'low').length;

  const errors =
    loggerEntries.filter((entry) => entry.level === 'error').length +
    watcherEntries.filter((entry) => entry.severity === 'high').length;

  return {
    count: loggerEntries.length + watcherEntries.length,
    warnings,
    errors,
    logs: loggerEntries,
    watcherAlerts: watcherEntries,
    watcherSummary,
    compilerDiagnostics,
    watcherLifecycle,
    watcherReconciliation: watcherResult.reconciliation
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
    watcherLifecycle: notifications.watcherLifecycle || summarizeWatcherAlertLifecycle(watcherAlerts),
    watcherReconciliation: notifications.watcherReconciliation || { deletedExpired: 0, summary: { total: watcherAlerts.length, byStatus: {} } }
  };
}
