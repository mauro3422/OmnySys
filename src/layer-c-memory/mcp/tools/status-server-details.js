import {
  getCachedCounts,
  getCachedMetadata,
  getDatabaseHealthSummary,
  getMcpSessionSummary,
  buildTelemetryProvenance,
  summarizeSurfaceAuditForStatus,
  buildCompilerMetricsSnapshot,
  buildCompilerHealthDashboard,
  buildCompilerHealthPanel,
  buildCompilerToolInventorySnapshot,
  buildCompilerToolInventoryReport
} from '../../../shared/compiler/index.js';
import { sessionManager } from '../core/session-manager.js';
import { compactRecentNotifications } from '../core/recent-notifications.js';
import { buildGovernanceAlerts, mergeRecentNotificationsWithGovernanceAlerts } from '../core/governance-alerts.js';
import { getRepository, getRepositoryDiagnostics } from '#layer-c/storage/repository/index.js';
import {
  attachCacheStatus,
  attachOrchestratorStatus,
  attachRuntimeHotReload,
  buildNodeVitals
} from './status-runtime.js';
import { attachDeepVitals } from './status-compiler.js';
import { loadCompilerExplainability } from './status-compiler-explainability.js';
import { loadMetadataStatus } from './status-metadata.js';
import {
  attachNotificationSignals,
  attachPhase2Status,
  buildRecentErrorsResponse,
  loadNotifications
} from './status-notifications.js';
import {
  compactDatabaseHealth,
  compactCompilerExplainabilitySummary,
  compactWatcherSummary
} from './status-summary.js';

function applyRepositoryIntegrityToDatabaseHealth(databaseHealth, repositoryIntegrity) {
  if (!databaseHealth || repositoryIntegrity?.healthy !== false) {
    return databaseHealth;
  }

  return {
    ...databaseHealth,
    healthy: false,
    healthScore: Math.min(Number(databaseHealth.healthScore || 0), 25),
    grade: 'F',
    summary: repositoryIntegrity.summary || 'SQLite integrity probe failed.',
    criticalFindings: [
      {
        code: 'sqlite_integrity_failed',
        severity: 'critical',
        message: repositoryIntegrity.summary || 'SQLite integrity probe failed.',
        details: repositoryIntegrity
      },
      ...(Array.isArray(databaseHealth.criticalFindings) ? databaseHealth.criticalFindings.slice(0, 2) : [])
    ],
    warnings: Array.isArray(databaseHealth.warnings) ? databaseHealth.warnings : [],
    recommendations: [
      repositoryIntegrity.recommendation || 'Treat the SQLite database as suspect until a clean quick_check passes.',
      ...(Array.isArray(databaseHealth.recommendations) ? databaseHealth.recommendations.slice(0, 2) : [])
    ],
    metrics: {
      ...(databaseHealth.metrics || {}),
      integrity: repositoryIntegrity
    }
  };
}

export async function enrichServerStatus(status, args, context, phase2Status, phase2InProgress, cachedMetadata, cachedCounts) {
  const { orchestrator, cache, projectPath, server } = context;
  const repo = projectPath ? getRepository(projectPath) : null;

  try {
    const repositoryDiagnostics = getRepositoryDiagnostics(projectPath);
    status.repository = repositoryDiagnostics;
    status.databaseHealth = repositoryDiagnostics?.status?.repo?.db
      ? getDatabaseHealthSummary(repositoryDiagnostics.status.repo.db)
      : null;
  } catch {
    status.repository = null;
    status.databaseHealth = null;
  }

  attachOrchestratorStatus(status, orchestrator);
  attachRuntimeHotReload(status, server);
  status.watcher = server.fileWatcher?.getFileWatcherStats?.() || null;

  const repositoryIntegrity = status.repository?.integrity || status.repository?.status?.integrity || null;

  const notifications = await loadNotifications(projectPath, server);
  const compactNotifications = compactRecentNotifications(notifications, { maxLogs: 5, maxWatcherAlerts: 5 });
  attachNotificationSignals(status, compactNotifications);

  if (phase2InProgress) {
    status.watcher = compactWatcherSummary(status.watcher);
    attachPhase2Status(
      status,
      server,
      cache,
      cachedMetadata,
      cachedCounts,
      phase2Status,
      notifications,
      buildNodeVitals
    );
    return {
      repo,
      recentErrors: buildRecentErrorsResponse(compactNotifications)
    };
  }

  status.metadata = await loadMetadataStatus(projectPath);
  attachCacheStatus(status, cache);
  status.nodeVitals = buildNodeVitals(server);
  await attachDeepVitals(status, projectPath, server);
  status.telemetryProvenance = buildTelemetryProvenance({
    source: 'status.runtime',
    phase2PendingFiles: status.metadata?.phase2PendingFiles || 0,
    runtimeRestartMode: status.hotReload.runtimeRestartMode,
    pendingRuntimeRestartFiles: status.hotReload.pendingRuntimeRestart?.files || [],
    watcherLifecycle: notifications.watcherLifecycle
  });

  const compilerExplainability = await loadCompilerExplainability(
    projectPath,
    notifications.watcherAlerts || [],
    status.sharedState || {},
    status.watcher,
    {
      scopePath: args?.scopePath || null,
      focusPath: args?.focusPath || null
    }
  );
  const governanceAlerts = buildGovernanceAlerts({
    compilerExplainability,
    source: 'status'
  });
  const mergedNotifications = mergeRecentNotificationsWithGovernanceAlerts(compactNotifications, governanceAlerts);
  attachNotificationSignals(status, mergedNotifications);
  status.compilerExplainability = compactCompilerExplainabilitySummary(compilerExplainability);
  status.surfaceAudit = summarizeSurfaceAuditForStatus(compilerExplainability.surfaceAudit);
  if (!status.databaseHealth) {
    status.databaseHealth = status.compilerExplainability?.databaseHealth || null;
  } else {
    status.databaseHealth = compactDatabaseHealth(status.databaseHealth);
  }

  status.databaseHealth = applyRepositoryIntegrityToDatabaseHealth(status.databaseHealth, repositoryIntegrity);

  const recentErrors = buildRecentErrorsResponse(mergedNotifications);
  const sessionSummary = getMcpSessionSummary(sessionManager, {
    runtimeSessionCount: server.sessions?.size || 0,
    recentErrors,
    sessionDb: repo?.db || null
  });
  const metricsSnapshot = buildCompilerMetricsSnapshot({
    projectPath,
    repo,
    compilerExplainability,
    watcherAlerts: compactNotifications.watcherAlerts || [],
    recentErrors,
    mcpSessionSummary: sessionSummary,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    captureSource: 'status.runtime',
    snapshotKind: 'status'
  });
  status.metricsSnapshot = metricsSnapshot;
  status.healthSnapshot = buildCompilerHealthDashboard(metricsSnapshot, compilerExplainability, {
    watcherAlerts: mergedNotifications.watcherAlerts || [],
    recentErrors
  });
  status.healthPanel = buildCompilerHealthPanel(status.healthSnapshot);
  const toolInventorySnapshot = buildCompilerToolInventorySnapshot({ includeSchemas: false });
  status.toolInventory = {
    snapshot: toolInventorySnapshot,
    report: buildCompilerToolInventoryReport(toolInventorySnapshot)
  };
  return {
    repo,
    recentErrors
  };
}

export default {
  enrichServerStatus
};
