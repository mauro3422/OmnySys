import {
  getCachedCounts,
  getCachedMetadata,
  getDatabaseHealthSummary,
  buildTelemetryProvenance,
  compactDatabaseHealth,
  compactWatcherSummary
} from '../../../shared/compiler/index.js';
import { compactRecentNotifications } from '../core/notifications.js';
import { getRepository, getRepositoryDiagnostics } from '../../storage/repository/index.js';
import { attachCacheStatus, attachOrchestratorStatus, attachRuntimeHotReload, buildNodeVitals } from './status-runtime.js';
import { attachDeepVitals } from './status-compiler.js';
import { loadMetadataStatus } from './status-metadata.js';
import {
  attachNotificationSignals,
  attachPhase2Status,
  buildRecentErrorsResponse,
  loadNotifications
} from './status-notifications.js';
import {
  buildStatusObservabilityBundle
} from '../../../shared/compiler/status-summary/summary.js';

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

  const bundle = await buildStatusObservabilityBundle({
    status,
    args,
    context: {
      ...context,
      repo
    },
    compactNotifications,
    repositoryIntegrity
  });
  attachNotificationSignals(status, bundle.mergedNotifications);
  status.compilerExplainability = bundle.compilerExplainability;
  status.surfaceAudit = bundle.surfaceAudit;
  status.metricsSnapshot = bundle.metricsSnapshot;
  status.healthSnapshot = bundle.healthSnapshot;
  status.healthPanel = bundle.healthPanel;
  status.healthPanel.observability = bundle.observabilitySummary;
  status.toolInventory = {
    snapshot: bundle.toolInventorySnapshot,
    report: bundle.toolInventoryReport
  };
  status.systemInventory = bundle.systemInventory;
  status.systemInventoryDetail = bundle.systemInventoryDetail;
  status.canonicalPromotion = bundle.canonicalPromotion;
  status.canonicalPromotionDetail = bundle.canonicalPromotionDetail;
  status.systemInventory.observability = bundle.observabilitySummary;
  status.systemInventoryDetail.observability = bundle.observability;
  status.canonicalPromotion.observability = bundle.observabilitySummary;
  status.canonicalPromotionDetail.observability = bundle.observability;
  status.proxyRuntimeTelemetry = bundle.proxyRuntimeTelemetry;
  status.bridgeRuntimeTelemetry = bundle.bridgeRuntimeTelemetry;
  status.bridgeCallReliability = bundle.bridgeCallReliability;
  status.mcpSessions = {
    ...status.mcpSessions,
    ...bundle.transport
  };
  status.transport = bundle.transport;
  status.requestDeliverySummary = bundle.transport.requestDeliverySummary;
  status.topologySummary = bundle.metricsSnapshot.current?.topologySummary || null;
  status.observability = bundle.observability;
  status.observabilitySummary = bundle.observabilitySummary;
  status.metricsSnapshot.proxyRuntimeTelemetry = bundle.proxyRuntimeTelemetry;
  status.metricsSnapshot.bridgeRuntimeTelemetry = bundle.bridgeRuntimeTelemetry;
  status.metricsSnapshot.bridgeCallReliability = bundle.bridgeCallReliability;
  status.metricsSnapshot.propagationLedger = status.propagationLedger;
  if (status.metricsSnapshot.current && typeof status.metricsSnapshot.current === 'object') {
    status.metricsSnapshot.current.proxyRuntimeTelemetry = bundle.proxyRuntimeTelemetry;
    status.metricsSnapshot.current.bridgeRuntimeTelemetry = bundle.bridgeRuntimeTelemetry;
    status.metricsSnapshot.current.bridgeCallReliability = bundle.bridgeCallReliability;
    status.metricsSnapshot.current.propagationLedger = status.propagationLedger;
  }
  if (status.healthSnapshot && typeof status.healthSnapshot === 'object') {
    status.healthSnapshot.proxyRuntimeTelemetry = bundle.proxyRuntimeTelemetry;
    status.healthSnapshot.bridgeRuntimeTelemetry = bundle.bridgeRuntimeTelemetry;
    status.healthSnapshot.bridgeCallReliability = bundle.bridgeCallReliability;
    status.healthSnapshot.observability = bundle.observability;
  }
  if (status.metricsSnapshot && typeof status.metricsSnapshot === 'object') {
    status.metricsSnapshot.propagation = status.propagation;
    status.metricsSnapshot.observability = bundle.observability;
  }
  status.background = status.background || {};
  status.background.mcpRequestDeliverySummary = bundle.transport.requestDeliverySummary;
  status.background.mcpTopologySummary = bundle.metricsSnapshot.current?.topologySummary || null;
  if (!status.databaseHealth) {
    status.databaseHealth = status.compilerExplainability?.databaseHealth || null;
  } else {
    status.databaseHealth = compactDatabaseHealth(status.databaseHealth);
  }
  status.databaseHealth = applyRepositoryIntegrityToDatabaseHealth(status.databaseHealth, repositoryIntegrity);

  return {
    repo,
    recentErrors: bundle.recentErrors
  };
}

export default {
  enrichServerStatus
};
