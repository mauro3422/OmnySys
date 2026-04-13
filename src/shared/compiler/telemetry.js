import {
  isBlockedState,
  isDriftingState,
  normalizeState
} from './signal-state-helpers.js';

function buildTelemetryObligation({
  key,
  label,
  required = true,
  state,
  reason,
  recommendation,
  sourceOfTruth
}) {
  const normalizedState = normalizeState(state, required ? 'missing' : 'deferred');
  return {
    key,
    label,
    required,
    state: normalizedState,
    satisfied: !isBlockedState(normalizedState) && !isDriftingState(normalizedState),
    reason: reason || null,
    recommendation: recommendation || null,
    sourceOfTruth: sourceOfTruth || label
  };
}

export function buildTelemetryRegistry({
  compilerExplainability,
  systemInventory,
  metricsSnapshot,
  healthDashboard,
  healthPanel,
  startupTelemetry,
  proxyRuntimeTelemetry,
  bridgeRuntimeTelemetry
}) {
  const obligations = [
    buildTelemetryObligation({
      key: 'compiler_explainability',
      label: 'Compiler Explainability',
      required: true,
      state: compilerExplainability?.error ? 'blocked' : compilerExplainability ? 'fresh' : 'missing',
      reason: compilerExplainability?.error || 'Compiler explainability must stay attached to status surfaces.',
      recommendation: 'Keep the compiler explainability payload attached to every health/status snapshot.',
      sourceOfTruth: 'compiler explainability loader'
    }),
    buildTelemetryObligation({
      key: 'system_inventory',
      label: 'System Inventory',
      required: true,
      state: systemInventory?.inventoryState || 'missing',
      reason: systemInventory?.summaryText || systemInventory?.nextAction || 'System inventory is missing.',
      recommendation: systemInventory?.nextAction || 'Attach the canonical system inventory before trusting control-plane state.',
      sourceOfTruth: 'system inventory'
    }),
    buildTelemetryObligation({
      key: 'policy_coverage',
      label: 'Policy Coverage',
      required: true,
      state: systemInventory?.policyCoverage?.coverageState || systemInventory?.policyCoverage?.state || 'missing',
      reason: systemInventory?.policyCoverage?.summaryText || systemInventory?.policyCoverage?.nextAction || 'Policy coverage is missing.',
      recommendation: systemInventory?.policyCoverage?.nextAction || 'Restore policy coverage before trusting control-plane decisions.',
      sourceOfTruth: 'policy coverage'
    }),
    buildTelemetryObligation({
      key: 'drift_assessment',
      label: 'Drift Assessment',
      required: true,
      state: compilerExplainability?.driftAssessment?.healthy === true
        ? 'fresh'
        : compilerExplainability?.driftAssessment?.primaryIssue?.state || compilerExplainability?.driftAssessment?.summary?.primaryIssue?.state || 'missing',
      reason: compilerExplainability?.driftAssessment?.summary?.nextAction
        || compilerExplainability?.driftAssessment?.primaryIssue?.reason
        || 'Drift assessment is missing.',
      recommendation: compilerExplainability?.driftAssessment?.primaryIssue?.recommendation
        || compilerExplainability?.driftAssessment?.summary?.nextAction
        || 'Attach the compiler drift assessment before trusting propagation readiness.',
      sourceOfTruth: 'compiler drift assessment'
    }),
    buildTelemetryObligation({
      key: 'metrics_snapshot',
      label: 'Metrics Snapshot',
      required: true,
      state: metricsSnapshot?.current?.behaviorState === 'blocked'
        ? 'blocked'
        : metricsSnapshot?.current?.mvpReady === true
          ? 'fresh'
          : metricsSnapshot?.current?.behaviorState || 'missing',
      reason: metricsSnapshot?.current?.summaryText || metricsSnapshot?.summary || 'Metrics snapshot is missing.',
      recommendation: metricsSnapshot?.current?.readinessReason || 'Capture the canonical metrics snapshot before trusting control-plane state.',
      sourceOfTruth: 'compiler metrics snapshot'
    }),
    buildTelemetryObligation({
      key: 'health_dashboard',
      label: 'Health Dashboard',
      required: true,
      state: healthDashboard?.status || 'missing',
      reason: healthDashboard?.summary || 'Health dashboard is missing.',
      recommendation: 'Keep the health dashboard derived from the canonical metrics snapshot.',
      sourceOfTruth: 'health dashboard'
    }),
    buildTelemetryObligation({
      key: 'health_panel',
      label: 'Health Panel',
      required: true,
      state: healthPanel?.status || 'missing',
      reason: healthPanel?.summary || 'Health panel is missing.',
      recommendation: healthPanel?.nextAction || 'Keep the health panel attached so operators see the control-plane state in one screen.',
      sourceOfTruth: 'health panel'
    }),
    buildTelemetryObligation({
      key: 'startup_telemetry',
      label: 'Startup Telemetry',
      required: false,
      state: startupTelemetry?.state || 'deferred',
      reason: startupTelemetry?.summary || 'Startup telemetry was not attached to this snapshot.',
      recommendation: startupTelemetry?.recommendation || 'Attach startup telemetry when debugging bootstrap/readiness regressions.',
      sourceOfTruth: 'startup telemetry'
    }),
    buildTelemetryObligation({
      key: 'proxy_runtime',
      label: 'Proxy Runtime Telemetry',
      required: false,
      state: proxyRuntimeTelemetry?.state || 'deferred',
      reason: proxyRuntimeTelemetry?.summary || 'Proxy runtime telemetry was not attached to this snapshot.',
      recommendation: proxyRuntimeTelemetry?.recommendation || 'Attach proxy runtime telemetry when validating reconnect behavior.',
      sourceOfTruth: 'proxy runtime telemetry'
    }),
    buildTelemetryObligation({
      key: 'bridge_runtime',
      label: 'Bridge Runtime Telemetry',
      required: false,
      state: bridgeRuntimeTelemetry?.healthState || bridgeRuntimeTelemetry?.state || 'deferred',
      reason: bridgeRuntimeTelemetry?.summary || 'Bridge runtime telemetry was not attached to this snapshot.',
      recommendation: bridgeRuntimeTelemetry?.recommendation || 'Attach bridge runtime telemetry when validating client disconnect behavior.',
      sourceOfTruth: 'bridge runtime telemetry'
    }),
    buildTelemetryObligation({
      key: 'session_transport',
      label: 'Session Transport',
      required: false,
      state: metricsSnapshot?.current?.transportProvenanceState || 'deferred',
      reason: metricsSnapshot?.current?.transportProvenanceReason || 'Session transport provenance was not attached to this snapshot.',
      recommendation: metricsSnapshot?.current?.transportProvenanceRecommendation || 'Attach explicit transport provenance so direct HTTP and stdio bridge clients remain distinguishable.',
      sourceOfTruth: 'mcp session summary'
    }),
    buildTelemetryObligation({
      key: 'request_delivery',
      label: 'Request Delivery',
      required: false,
      state: metricsSnapshot?.current?.requestDeliveryState || 'deferred',
      reason: metricsSnapshot?.current?.requestDeliveryReason || 'MCP request delivery telemetry was not attached to this snapshot.',
      recommendation: metricsSnapshot?.current?.requestDeliveryRecommendation || 'Attach request delivery telemetry so transport gaps are visible even when tool execution succeeds.',
      sourceOfTruth: 'mcp request delivery telemetry'
    }),
    buildTelemetryObligation({
      key: 'mcp_topology',
      label: 'MCP Topology',
      required: false,
      state: metricsSnapshot?.current?.topologyState || 'deferred',
      reason: metricsSnapshot?.current?.topologyReason || 'MCP topology telemetry was not attached to this snapshot.',
      recommendation: metricsSnapshot?.current?.topologyRecommendation || 'Attach MCP topology telemetry so client identity, bridge freshness, proxy heartbeat and request delivery stay visible together.',
      sourceOfTruth: 'mcp topology telemetry'
    })
  ];

  const required = obligations.filter((item) => item.required);
  const optional = obligations.filter((item) => !item.required);
  const blockedCount = obligations.filter((item) => isBlockedState(item.state)).length;
  const requiredSatisfiedCount = required.filter((item) => item.satisfied).length;
  const requiredMissing = required.filter((item) => !item.satisfied);
  const optionalMissingCount = optional.filter((item) => ['missing', 'deferred'].includes(normalizeState(item.state))).length;
  const partialCount = obligations.filter((item) => normalizeState(item.state) === 'partial').length;

  let state = 'ready';
  if (blockedCount > 0) {
    state = 'blocked';
  } else if (requiredMissing.length > 0 || partialCount > 0) {
    state = 'stale';
  } else if (optionalMissingCount > 0) {
    state = 'watching';
  }

  return {
    state,
    requiredCount: required.length,
    requiredSatisfiedCount,
    requiredMissingCount: requiredMissing.length,
    optionalCount: optional.length,
    optionalMissingCount,
    blockedCount,
    partialCount,
    nextAction: requiredMissing[0]?.recommendation
      || optional.find((item) => ['missing', 'deferred'].includes(normalizeState(item.state)))?.recommendation
      || 'Telemetry obligations are attached.',
    reason: requiredMissing[0]?.reason
      || (blockedCount > 0 ? 'One or more telemetry obligations are blocked.' : 'Telemetry obligations are attached.'),
    obligations
  };
}

export default {
  buildTelemetryRegistry
};
