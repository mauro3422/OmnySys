/**
 * Canonical compiler status summary envelope and observability bundle helpers.
 */

import {
  buildCanonicalPromotionReport,
  buildCanonicalPromotionSnapshot,
  buildCompilerHealthDashboard,
  buildCompilerHealthPanel,
  buildCompilerMetricsSnapshot,
  buildCompilerSystemInventoryReport,
  buildCompilerSystemInventorySnapshot,
  buildCompilerToolInventoryReport,
  buildCompilerToolInventorySnapshot,
  buildMcpRequestDeliverySummary,
  buildTelemetryProvenance,
  getMcpSessionSummary,
  loadCompilerExplainability,
  persistMcpTopologyTelemetry,
  readBridgeRuntimeTelemetry,
  readProxyRuntimeTelemetry,
  summarizeBridgeCallReliability,
  summarizeBridgeRuntimeTelemetry,
  summarizeCompilerExplainability,
  summarizeCompilerObservabilityContract,
  summarizeProxyRuntimeTelemetry,
  summarizeSurfaceAuditForStatus,
  compactDatabaseHealth
} from '../index.js';
import { sessionManager } from '../../../layer-c-memory/mcp/core/manager.js';
import { buildGovernanceAlerts, mergeRecentNotificationsWithGovernanceAlerts } from '../../../layer-c-memory/mcp/core/governance-alerts.js';
import { buildRecentErrorsResponse } from '../../../layer-c-memory/mcp/tools/status-notifications.js';

async function loadObservabilityContractModule() {
  return import(`../compiler-observability-contract-runtime.js?rev=${Date.now()}`);
}

export function buildCompilerStatusSummaryEnvelope(status = {}, recentErrors = null, sections = {}) {
  return {
    initialized: status.initialized,
    initializing: status.initializing,
    project: status.project,
    hotReloadTest: status.hotReloadTest,
    timestamp: status.timestamp,
    telemetryMode: status.telemetryMode,
    summary: {
      total: recentErrors?.summary?.total || 0,
      warnings: recentErrors?.summary?.warnings || 0,
      errors: recentErrors?.summary?.errors || 0
    },
    recentErrors,
    ...sections
  };
}

function buildTransportSummary(sessionSummary, requestDeliverySummary) {
  return {
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
}

export async function buildStatusObservabilityBundle({ status, args, context, compactNotifications }) {
  const { projectPath, server, repo } = context;
  const sharedState = server?.sharedState || context?.sharedState || {};

  const compilerExplainability = await loadCompilerExplainability(
    projectPath,
    compactNotifications.watcherAlerts || [],
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
  const transportSummary = buildTransportSummary(sessionSummary, requestDeliverySummary);

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
  metricsSnapshot.systemInventory = systemInventory;
  metricsSnapshot.systemInventoryDetail = systemInventoryDetail;
  metricsSnapshot.canonicalPromotion = canonicalPromotion;
  metricsSnapshot.canonicalPromotionDetail = canonicalPromotionDetail;
  metricsSnapshot.startupTelemetry = server?.startupTelemetry || null;
  metricsSnapshot.requestDeliverySummary = requestDeliverySummary;
  metricsSnapshot.topologySummary = metricsSnapshot.current?.topologySummary || null;
  transportSummary.topologySummary = metricsSnapshot.current?.topologySummary || null;
  if (metricsSnapshot.current && typeof metricsSnapshot.current === 'object') {
    metricsSnapshot.current.systemInventory = systemInventory;
    metricsSnapshot.current.canonicalPromotion = canonicalPromotion;
    metricsSnapshot.current.startupTelemetry = server?.startupTelemetry || null;
    metricsSnapshot.current.requestDeliverySummary = requestDeliverySummary;
    metricsSnapshot.current.topologySummary = metricsSnapshot.current?.topologySummary || null;
  }

  const healthDashboard = buildCompilerHealthDashboard(metricsSnapshot, compilerExplainability, {
    watcherAlerts: mergedNotifications.watcherAlerts || [],
    recentErrors,
    systemInventory
  });
  healthDashboard.systemInventory = systemInventory;
  healthDashboard.systemInventoryDetail = systemInventoryDetail;
  healthDashboard.canonicalPromotion = canonicalPromotion;
  healthDashboard.canonicalPromotionDetail = canonicalPromotionDetail;
  const healthPanel = buildCompilerHealthPanel(healthDashboard);
  const { buildCompilerObservabilityContract, summarizeCompilerObservabilityContract } = await loadObservabilityContractModule();
  const observability = buildCompilerObservabilityContract({
    projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    compilerExplainability,
    systemInventory,
    canonicalPromotion,
    metricsSnapshot,
    healthDashboard,
    healthPanel,
    startupTelemetry: server?.startupTelemetry || null,
    proxyRuntimeTelemetry,
    bridgeRuntimeTelemetry
  });
  const observabilitySummary = summarizeCompilerObservabilityContract(observability);

  return {
    compilerExplainability: summarizeCompilerExplainability(compilerExplainability),
    surfaceAudit: summarizeSurfaceAuditForStatus(compilerExplainability.surfaceAudit),
    systemInventory,
    systemInventoryDetail,
    canonicalPromotion,
    canonicalPromotionDetail,
    toolInventorySnapshot,
    toolInventoryReport: buildCompilerToolInventoryReport(toolInventorySnapshot),
    metricsSnapshot,
    healthSnapshot: healthDashboard,
    healthPanel,
    observability,
    observabilitySummary,
    proxyRuntimeTelemetry,
    bridgeRuntimeTelemetry,
    bridgeCallReliability,
    transport: transportSummary,
    recentErrors,
    mergedNotifications,
    governanceAlerts
  };
}

export default {
  buildCompilerStatusSummaryEnvelope,
  buildStatusObservabilityBundle
};
