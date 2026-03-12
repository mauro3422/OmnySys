import { getRecentLogs, clearRecentLogs } from '../../../utils/logger.js';
import { syncRuntimeTableHealthIssues } from '../../../core/diagnostics/runtime-table-health.js';
import {
  buildTelemetryProvenance,
  buildRuntimeCodeFreshness,
  classifySignalConfidence,
  summarizeCompilerDiagnostics,
  summarizeSignalConfidence,
  summarizeWatcherAlerts,
  summarizeWatcherAlertLifecycle,
  normalizeSeverity,
  severityToLevel
} from '../../../shared/compiler/index.js';
import { loadWatcherIssues } from '../../../core/file-watcher/watcher-issue-persistence.js';

function mapLoggerEntry(entry) {
  const severity = normalizeSeverity(entry.level === 'error' ? 'high' : (entry.level === 'warn' ? 'medium' : 'low'));
  return {
    source: 'logger',
    level: entry.level,
    severity,
    message: entry.message,
    time: new Date(entry.time).toISOString()
  };
}

function getRuntimeRestartState(server) {
  return {
    runtimeRestartMode: server?.runtimeRestartMode || 'manual',
    pendingRuntimeRestartFiles: Array.from(server?._pendingHotReloadRestartFiles || [])
  };
}

function inferRuntimeRestartStateFromLogs(loggerEntries = []) {
  const pendingFiles = new Set();

  for (const entry of loggerEntries) {
    const message = String(entry?.message || '');
    const match = message.match(/queued manual runtime restart:\s*(.+)$/i);
    if (!match) {
      continue;
    }

    for (const rawFile of match[1].split(',')) {
      const file = rawFile.trim();
      if (file) {
        pendingFiles.add(file);
      }
    }
  }

  return {
    runtimeRestartMode: 'manual',
    pendingRuntimeRestartFiles: Array.from(pendingFiles)
  };
}

function resolveRuntimeRestartState(server = null, loggerEntries = []) {
  const runtimeRestartState = getRuntimeRestartState(server);

  // If we have a live server instance, trust its in-memory restart queue over
  // historical logger messages. Old "queued manual runtime restart" lines can
  // otherwise make freshness look stale after the runtime already reconciled.
  if (server) {
    return runtimeRestartState;
  }

  return inferRuntimeRestartStateFromLogs(loggerEntries);
}

function buildNotificationsProvenance(watcherLifecycle, watcherEntries = [], server = null, loggerEntries = []) {
  const runtimeRestartState = resolveRuntimeRestartState(server, loggerEntries);
  const pendingRuntimeRestartFiles = runtimeRestartState.pendingRuntimeRestartFiles;
  const runtimeRestartMode = runtimeRestartState.runtimeRestartMode;
  const runtimeCodeFreshness = buildRuntimeCodeFreshness({
    pendingRuntimeRestartFiles,
    runtimeRestartMode
  });

  return {
    ...buildTelemetryProvenance({
      source: 'watcher+logger',
      watcherLifecycle,
      pendingRuntimeRestartFiles,
      runtimeRestartMode
    }),
    restartLifecycle: {
      restartType: 'observational',
      proxyManaged: false,
      requiresClientPatience: false,
      recommendedActions: runtimeCodeFreshness.restartRequired
        ? ['Restart the MCP runtime so tool/runtime modules are reloaded.']
        : [],
      summary: runtimeCodeFreshness.summary
    }
  };
}

export async function collectRecentNotifications(projectPath, options = {}) {
  const {
    clearLoggerBuffer = true,
    watcherLimit = 10,
    server = null
  } = options;

  const rawLogs = typeof getRecentLogs === 'function' ? getRecentLogs() : [];
  if (clearLoggerBuffer && typeof clearRecentLogs === 'function') {
    clearRecentLogs();
  }

  const loggerEntries = rawLogs.map(mapLoggerEntry);
  await syncRuntimeTableHealthIssues(projectPath);
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
    loggerEntries.filter((entry) => severityToLevel(entry.severity) === 'warn').length +
    watcherEntriesWithConfidence.filter((entry) => severityToLevel(entry.severity) === 'warn').length;

  const errors =
    loggerEntries.filter((entry) => severityToLevel(entry.severity) === 'error').length +
    watcherEntriesWithConfidence.filter((entry) => severityToLevel(entry.severity) === 'error').length;

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
    provenance: buildNotificationsProvenance(watcherLifecycle, watcherEntriesWithConfidence, server, loggerEntries)
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
      watcherAlerts,
      notifications.server || null,
      logs
    )
  };
}
// Force reindex: 1430014351
// Trigger reindex: 1696058712
// Test conceptual duplicate detection: 723619026
// Debug: 841588844
// Test after fix: 1345224501
