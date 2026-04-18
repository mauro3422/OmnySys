import {
  getCachedCounts,
  getCachedMetadata,
  getDatabaseHealthSummary,
  getMcpSessionSummary,
  buildMcpRequestDeliverySummary,
  buildTelemetryProvenance,
  summarizeSurfaceAuditForStatus,
  buildCompilerMetricsSnapshot,
  buildCompilerHealthDashboard,
  buildCompilerHealthPanel,
  buildCompilerObservabilityContract,
  summarizeCompilerObservabilityContract,
  buildCanonicalPromotionReport,
  buildCanonicalPromotionSnapshot,
  buildCompilerToolInventorySnapshot,
  buildCompilerToolInventoryReport,
  buildCompilerSystemInventoryReport,
  buildCompilerSystemInventorySnapshot,
  persistMcpTopologyTelemetry,
  loadCompilerExplainability,
  compactDatabaseHealth,
  compactWatcherSummary,
  summarizeCompilerExplainability,
  readProxyRuntimeTelemetry,
  summarizeProxyRuntimeTelemetry,
  readBridgeRuntimeTelemetry,
  summarizeBridgeRuntimeTelemetry,
  summarizeBridgeCallReliability
} from '../../../shared/compiler/index.js';
import { sessionManager } from '../core/manager.js';
import { compactRecentNotifications } from '../core/notifications.js';
import { buildGovernanceAlerts, mergeRecentNotificationsWithGovernanceAlerts } from '../core/governance-alerts.js';
import { getRepository, getRepositoryDiagnostics } from '../../storage/repository/index.js';
import {
  attachCacheStatus,
  attachOrchestratorStatus,
  attachRuntimeHotReload,
  buildNodeVitals
} from './status-runtime.js';
import { attachDeepVitals } from './status-compiler.js';
import { loadMetadataStatus } from './status-metadata.js';
import {
  attachNotificationSignals,
  attachPhase2Status,
  buildRecentErrorsResponse,
  loadNotifications
} from './status-notifications.js';
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
  const sharedState = server?.sharedState || context?.sharedState || {};

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
    sharedState,
    status.watcher,
    {
      scopePath: args?.scopePath || null,
      focusPath: args?.focusPath || null,
      forceFresh: true
    }
  );
  if (compilerExplainability && server) {
    server.liveInsights = compilerExplainability;
  }
  const toolInventorySnapshot = buildCompilerToolInventorySnapshot({ includeSchemas: false });
  const systemInventoryDetail = buildCompilerSystemInventorySnapshot({
    projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    compilerExplainability,
    toolInventory: toolInventorySnapshot,
    limit: 10
  });
  const systemInventory = buildCompilerSystemInventoryReport(systemInventoryDetail);
  const canonicalPromotionDetail = buildCanonicalPromotionSnapshot({
    projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    systemInventory
  });
  const canonicalPromotion = buildCanonicalPromotionReport(canonicalPromotionDetail);
  compilerExplainability.systemInventory = systemInventoryDetail;
  compilerExplainability.canonicalPromotion = canonicalPromotionDetail;
  const governanceAlerts = buildGovernanceAlerts({
    compilerExplainability,
    source: 'status'
  });
  const mergedNotifications = mergeRecentNotificationsWithGovernanceAlerts(compactNotifications, governanceAlerts);
  attachNotificationSignals(status, mergedNotifications);
  status.compilerExplainability = summarizeCompilerExplainability(compilerExplainability);
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
  const requestDeliverySummary = buildMcpRequestDeliverySummary(repo?.db || null, {
    projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    windowDays: 7
  });
  const proxyRuntimeTelemetry = summarizeProxyRuntimeTelemetry(readProxyRuntimeTelemetry(projectPath));
  const bridgeRuntimeTelemetry = summarizeBridgeRuntimeTelemetry(readBridgeRuntimeTelemetry(projectPath));
  const bridgeCallReliability = summarizeBridgeCallReliability(readBridgeRuntimeTelemetry(projectPath));
  const transportSummary = {
    state: sessionSummary.transportProvenanceState || 'missing',
    healthy: sessionSummary.transportProvenanceHealthy === true,
    trustworthy: sessionSummary.transportProvenanceTrustworthy !== false,
    reason: sessionSummary.transportProvenanceReason || null,
    recommendation: sessionSummary.transportProvenanceRecommendation || null,
    transportSessionStateCounts: sessionSummary.transportSessionStateCounts || {},
    transportRequestPhaseCounts: sessionSummary.transportRequestPhaseCounts || {},
    transportClientRouteIdCounts: sessionSummary.transportClientRouteIdCounts || {},
    transportHandshakeSignatureCounts: sessionSummary.transportHandshakeSignatureCounts || {},
    transportSessionHeaderPresentCount: sessionSummary.transportSessionHeaderPresentCount || 0,
    transportSessionHeaderMissingCount: sessionSummary.transportSessionHeaderMissingCount || 0,
    alertState: sessionSummary.transportAlertState || 'missing',
    alertCount: sessionSummary.transportAlertCount || 0,
    alertHealthy: sessionSummary.transportAlertHealthy === true,
    alertTrustworthy: sessionSummary.transportAlertTrustworthy !== false,
    alertReason: sessionSummary.transportAlertReason || null,
    alertRecommendation: sessionSummary.transportAlertRecommendation || null,
    alertSummary: sessionSummary.transportAlertSummary || null,
    transportOriginCounts: sessionSummary.transportOriginCounts || {},
    transportOriginTotal: sessionSummary.transportOriginTotal || 0,
    transportOriginDistinctCount: sessionSummary.transportOriginDistinctCount || 0,
    transportOriginKnownCount: sessionSummary.transportOriginKnownCount || 0,
    dominantTransportOrigin: sessionSummary.dominantTransportOrigin || null,
    dominantTransportOriginCount: sessionSummary.dominantTransportOriginCount || 0,
    transportOriginMix: Array.isArray(sessionSummary.transportOriginMix) ? sessionSummary.transportOriginMix.slice(0, 8) : [],
    transportAlerts: Array.isArray(sessionSummary.transportAlerts) ? sessionSummary.transportAlerts.slice(0, 8) : [],
    requestDeliverySummary,
    requestDeliveryState: requestDeliverySummary?.state || 'missing',
    requestDeliveryHealthy: requestDeliverySummary?.healthy === true,
    requestDeliveryTrustworthy: requestDeliverySummary?.trustworthy !== false,
    requestDeliveryReason: requestDeliverySummary?.summary || null,
    requestDeliveryRecommendation: requestDeliverySummary?.recommendation || null,
    requestDeliveryAlerts: Array.isArray(requestDeliverySummary?.alerts) ? requestDeliverySummary.alerts.slice(0, 8) : [],
    requestDeliveryTotalRequests: requestDeliverySummary?.totalRequests || 0,
    requestDeliveryDeliveredRequests: requestDeliverySummary?.deliveredRequests || 0,
    requestDeliveryInterruptedRequests: requestDeliverySummary?.interruptedRequests || 0,
    requestDeliveryFailedRequests: requestDeliverySummary?.failedRequests || 0,
    topologySummary: null
  };
  const metricsSnapshot = buildCompilerMetricsSnapshot({
    projectPath,
    repo,
    compilerExplainability,
    watcherAlerts: compactNotifications.watcherAlerts || [],
    recentErrors,
    mcpSessionSummary: sessionSummary,
    mcpRequestDeliverySummary: requestDeliverySummary,
    systemInventory,
    canonicalPromotion,
    startupTelemetry: server?.startupTelemetry || null,
    proxyRuntimeTelemetry,
    bridgeRuntimeTelemetry,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    captureSource: 'status.runtime',
    snapshotKind: 'status'
  });
  if (repo?.db && metricsSnapshot?.current?.topologySummary?.event) {
    try {
      persistMcpTopologyTelemetry(repo.db, metricsSnapshot.current.topologySummary.event);
    } catch {
      // Best effort persistence only.
    }
  }
  status.metricsSnapshot = metricsSnapshot;
  status.metricsSnapshot.systemInventory = systemInventory;
  status.metricsSnapshot.systemInventoryDetail = systemInventoryDetail;
  status.metricsSnapshot.canonicalPromotion = canonicalPromotion;
  status.metricsSnapshot.canonicalPromotionDetail = canonicalPromotionDetail;
  status.metricsSnapshot.startupTelemetry = server?.startupTelemetry || null;
  status.metricsSnapshot.requestDeliverySummary = requestDeliverySummary;
  status.metricsSnapshot.topologySummary = metricsSnapshot.current?.topologySummary || null;
  transportSummary.topologySummary = metricsSnapshot.current?.topologySummary || null;
  if (status.metricsSnapshot.current && typeof status.metricsSnapshot.current === 'object') {
    status.metricsSnapshot.current.systemInventory = systemInventory;
    status.metricsSnapshot.current.canonicalPromotion = canonicalPromotion;
    status.metricsSnapshot.current.startupTelemetry = server?.startupTelemetry || null;
    status.metricsSnapshot.current.requestDeliverySummary = requestDeliverySummary;
    status.metricsSnapshot.current.topologySummary = metricsSnapshot.current?.topologySummary || null;
  }
  status.healthSnapshot = buildCompilerHealthDashboard(metricsSnapshot, compilerExplainability, {
    watcherAlerts: mergedNotifications.watcherAlerts || [],
    recentErrors,
    systemInventory
  });
  status.healthSnapshot.systemInventory = systemInventory;
  status.healthSnapshot.systemInventoryDetail = systemInventoryDetail;
  status.healthSnapshot.canonicalPromotion = canonicalPromotion;
  status.healthSnapshot.canonicalPromotionDetail = canonicalPromotionDetail;
  status.healthPanel = buildCompilerHealthPanel(status.healthSnapshot);
  const observability = buildCompilerObservabilityContract({
    projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    compilerExplainability,
    systemInventory,
    canonicalPromotion,
    metricsSnapshot,
    healthDashboard: status.healthSnapshot,
    healthPanel: status.healthPanel,
    startupTelemetry: server?.startupTelemetry || null,
    proxyRuntimeTelemetry,
    bridgeRuntimeTelemetry
  });
  const observabilitySummary = summarizeCompilerObservabilityContract(observability);
  status.propagation = canonicalPromotionDetail?.folderization?.propagation
    || metricsSnapshot?.current?.folderizationPropagation
    || metricsSnapshot?.folderizationPropagation
    || null;
  status.propagationLedger = compilerExplainability.propagationLedger
    ? {
      ...compilerExplainability.propagationLedger,
      state: compilerExplainability.propagationLedger.state || metricsSnapshot?.current?.propagationLedger?.state || 'watching'
    }
    : metricsSnapshot?.current?.propagationLedger || null;
  status.healthPanel.observability = observabilitySummary;
  status.toolInventory = {
    snapshot: toolInventorySnapshot,
    report: buildCompilerToolInventoryReport(toolInventorySnapshot)
  };
  status.systemInventory = systemInventory;
  status.systemInventoryDetail = systemInventoryDetail;
  status.canonicalPromotion = canonicalPromotion;
  status.canonicalPromotionDetail = canonicalPromotionDetail;
  status.systemInventory.observability = observabilitySummary;
  status.systemInventoryDetail.observability = observability;
  status.canonicalPromotion.observability = observabilitySummary;
  status.canonicalPromotionDetail.observability = observability;
  status.startupTelemetry = server?.startupTelemetry || null;
  status.proxyRuntimeTelemetry = proxyRuntimeTelemetry;
  status.bridgeRuntimeTelemetry = bridgeRuntimeTelemetry;
  status.bridgeCallReliability = bridgeCallReliability;
  status.mcpSessions = sessionSummary;
  status.transport = transportSummary;
  status.requestDeliverySummary = requestDeliverySummary;
  status.topologySummary = metricsSnapshot.current?.topologySummary || null;
  status.observability = observability;
  status.observabilitySummary = observabilitySummary;
  status.metricsSnapshot.proxyRuntimeTelemetry = proxyRuntimeTelemetry;
  status.metricsSnapshot.bridgeRuntimeTelemetry = bridgeRuntimeTelemetry;
  status.metricsSnapshot.bridgeCallReliability = bridgeCallReliability;
  status.metricsSnapshot.propagationLedger = status.propagationLedger;
  if (status.metricsSnapshot.current && typeof status.metricsSnapshot.current === 'object') {
    status.metricsSnapshot.current.proxyRuntimeTelemetry = proxyRuntimeTelemetry;
    status.metricsSnapshot.current.bridgeRuntimeTelemetry = bridgeRuntimeTelemetry;
    status.metricsSnapshot.current.bridgeCallReliability = bridgeCallReliability;
    status.metricsSnapshot.current.propagationLedger = status.propagationLedger;
  }
  if (status.healthSnapshot && typeof status.healthSnapshot === 'object') {
    status.healthSnapshot.proxyRuntimeTelemetry = proxyRuntimeTelemetry;
    status.healthSnapshot.bridgeRuntimeTelemetry = bridgeRuntimeTelemetry;
    status.healthSnapshot.bridgeCallReliability = bridgeCallReliability;
    status.healthSnapshot.observability = observability;
  }
  if (status.metricsSnapshot && typeof status.metricsSnapshot === 'object') {
    status.metricsSnapshot.propagation = status.propagation;
    status.metricsSnapshot.observability = observability;
  }
  status.background = status.background || {};
  status.background.mcpRequestDeliverySummary = requestDeliverySummary;
  status.background.mcpTopologySummary = metricsSnapshot.current?.topologySummary || null;
  return {
    repo,
    recentErrors
  };
}

export default {
  enrichServerStatus
};
