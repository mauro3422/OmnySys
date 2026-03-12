import { collectRecentNotifications, normalizeRecentNotifications } from '../core/recent-notifications.js';
import {
  buildCompilerReadinessStatus,
  buildRuntimeCodeFreshness,
  buildTelemetryProvenance,
  getLastAnalyzed,
  isBreakingWatcherAlert,
  getMcpSessionSummary,
  summarizeSignalConfidence
} from '../../../shared/compiler/index.js';

export async function loadNotifications(projectPath, server, clearLoggerBuffer = false) {
  return normalizeRecentNotifications(await collectRecentNotifications(projectPath, {
    clearLoggerBuffer,
    watcherLimit: 20,
    server
  }));
}

export function attachNotificationSignals(status, notifications) {
  status.recentNotifications = notifications;
  status.signalConfidence = notifications.signalConfidence || summarizeSignalConfidence(notifications.watcherAlerts || []);
}

export function attachPhase2Status(status, server, cache, cachedMetadata, cachedCounts, phase2Status, notifications, buildNodeVitals) {
  const runtimeSessionCount = server.sessions?.size || 0;
  status.metadata = {
    totalFiles: cachedCounts.totalFiles,
    totalFunctions: cachedCounts.totalAtoms,
    lastAnalyzed: getLastAnalyzed(cachedMetadata),
    liveAtomCount: cachedCounts.totalAtoms,
    liveFileCount: cachedCounts.totalFiles,
    phase2PendingFiles: phase2Status.pendingFiles,
    phase2CompletedFiles: phase2Status.completedFiles,
    societiesCount: null
  };

  status.cache = cache?.getStats ? cache.getStats() : { status: 'initializing' };
  status.nodeVitals = buildNodeVitals(server);
  status.sharedState = {
    status: 'settling',
    message: 'Phase 2 deep scan in progress; global semantic metrics may lag.'
  };
  status.background = {
    phase2PendingFiles: phase2Status.pendingFiles,
    phase2CompletedFiles: phase2Status.completedFiles,
    societiesCount: null,
    phase2: phase2Status,
    mcpSessionSummary: getMcpSessionSummary(null, { runtimeSessionCount })
  };
  status.mcpSessions = {
    totalActive: runtimeSessionCount,
    totalPersistent: null,
    totalPersistentActive: null,
    uniqueClients: runtimeSessionCount,
    clientsWithDuplicates: null,
    health: runtimeSessionCount > 20 ? 'STRESSED' : 'HEALTHY'
  };
  status.compilerReadiness = buildCompilerReadinessStatus({
    phase2PendingFiles: phase2Status.pendingFiles,
    societiesCount: 0,
    runtimeSessions: runtimeSessionCount,
    persistentActive: 0,
    clientsWithDuplicates: 0
  });
  status.compilerReadiness.ready = false;
  status.compilerReadiness.warnings = [
    `Phase 2 deep scan still running (${phase2Status.processedFiles}/${phase2Status.totalFiles}, ${phase2Status.percentComplete}%).`,
    'Global metrics are still settling; use atom/file-level queries for fresh detail.'
  ];
  status.telemetryProvenance = buildTelemetryProvenance({
    source: 'status.phase2',
    phase2PendingFiles: phase2Status.pendingFiles,
    runtimeRestartMode: status.hotReload.runtimeRestartMode,
    pendingRuntimeRestartFiles: status.hotReload.pendingRuntimeRestart?.files || [],
    watcherLifecycle: notifications.watcherLifecycle
  });
}

export function buildRecentErrorsResponse(notifications) {
  const logs = notifications.logs || [];
  const watcherAlerts = notifications.watcherAlerts || [];
  const warnings = logs.filter((entry) => entry.level === 'warn');
  const errors = logs.filter((entry) => entry.level === 'error');
  const watcherHigh = watcherAlerts.filter((entry) => isBreakingWatcherAlert(entry) || entry.severity === 'high').length;
  const watcherWarn = watcherAlerts.filter((entry) => !isBreakingWatcherAlert(entry) && entry.severity !== 'high').length;

  const incidents = {
    atomic: errors.filter((entry) => entry.message.includes('atomic') || entry.message.includes('AutoFix')).length,
    transaction: errors.filter((entry) => entry.message.includes('transaction')).length,
    database: errors.filter((entry) => entry.message.includes('SQLite') || entry.message.includes('database')).length,
    others: 0
  };
  incidents.others = errors.length - (incidents.atomic + incidents.transaction + incidents.database);

  return {
    summary: {
      total: notifications.count,
      warnings: warnings.length + watcherWarn,
      errors: errors.length + watcherHigh,
      incidents
    },
    logs: logs.map((entry) => ({
      level: entry.level,
      message: entry.message,
      time: new Date(entry.time).toISOString()
    })),
    watcherAlerts,
    runtimeCodeFreshness: notifications.provenance?.runtimeCodeFreshness || buildRuntimeCodeFreshness(),
    signalConfidence: notifications.signalConfidence,
    provenance: notifications.provenance
  };
}
