/**
 * Canonical observability contract for compiler/runtime surfaces.
 *
 * This layer does not invent new diagnostics. It composes the existing
 * propagation, policy, inventory, metrics, readiness and telemetry signals
 * into one actionable contract so status/inventory/metrics consumers can ask
 * a single question: "is the system connected, coherent and ready?"
 */

import { asNumber } from './core-utils.js';
import {
  resolveControlPlaneContracts,
  resolveDashboardControlPlaneContracts
} from './status-control-plane-contracts.js';
import { buildArchiveWindowDrift } from './archive-window-drift.js';
import { summarizeReadinessState } from './readiness-state-helpers.js';
import { buildInventoryState } from './inventory-state-helpers.js';
import {
  compactHealthPanelHealth,
  compactInventorySignals,
  compactMetricsHealth,
  compactTelemetryState
} from './compiler-observability-contract-helpers.js';
import {
  buildObservabilitySignals,
  countSignalStates,
  pickPrimarySignal,
  summarizeGatewayState,
  summarizeMetricsState,
  summarizePolicyState,
  summarizePropagationState
} from './compiler-observability-contract-signals.js';

function normalizeContractState(value, fallback = 'missing') {
  const state = String(value || '').trim().toLowerCase();
  return state || fallback;
}

export function buildCompilerObservabilityContract({
  projectPath = null,
  scopePath = null,
  focusPath = null,
  compilerExplainability = null,
  systemInventory = null,
  canonicalPromotion = null,
  metricsSnapshot = null,
  healthDashboard = null,
  healthPanel = null,
  startupTelemetry = null,
  proxyRuntimeTelemetry = null,
  bridgeRuntimeTelemetry = null,
  controlPlaneContracts = null,
  dashboardControlPlaneContracts = null
} = {}) {
  const resolvedControlPlaneContracts = controlPlaneContracts || resolveControlPlaneContracts({
    systemInventory,
    canonicalPromotion,
    metricsSnapshot,
    healthSnapshot: healthDashboard,
    compilerExplainability
  });
  const resolvedDashboardControlPlaneContracts = dashboardControlPlaneContracts || resolveDashboardControlPlaneContracts(metricsSnapshot, compilerExplainability);
  const inventoryCompact = compactInventorySignals(systemInventory || resolvedControlPlaneContracts.systemInventory || compilerExplainability?.systemInventory || null);
  const policy = summarizePolicyState(resolvedControlPlaneContracts, compilerExplainability);
  const archiveWindowDrift = healthDashboard?.archiveWindowDrift
    || metricsSnapshot?.current?.archiveWindowDrift
    || buildArchiveWindowDrift(
      healthDashboard?.archive || healthDashboard?.lifetime || metricsSnapshot?.current?.healthArchive || metricsSnapshot?.healthArchive || null,
      healthDashboard?.metricsArchive || metricsSnapshot?.current?.metricsArchive || metricsSnapshot?.metricsArchive || null,
      metricsSnapshot?.history || healthDashboard?.history || null
    );
  const propagation = summarizePropagationState({
    propagationExpansion: resolvedDashboardControlPlaneContracts.propagationExpansion || compilerExplainability?.driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')
      || (compilerExplainability?.driftAssessment?.primaryIssue?.key === 'propagation_expansion' ? compilerExplainability.driftAssessment.primaryIssue : null),
    folderizationPropagation: resolvedDashboardControlPlaneContracts.folderizationPropagation || metricsSnapshot?.current?.folderizationPropagation || null,
    policyCoverage: policy.policyCoverage
  });
  const gateway = summarizeGatewayState(compilerExplainability, resolvedControlPlaneContracts);
  const metrics = summarizeMetricsState(metricsSnapshot, healthDashboard);
  const readiness = summarizeReadinessState(healthPanel, healthDashboard);
  const telemetry = compactTelemetryState(startupTelemetry, proxyRuntimeTelemetry, bridgeRuntimeTelemetry);
  const inventory = buildInventoryState(inventoryCompact);

  const signals = buildObservabilitySignals({
    policy,
    propagation,
    archiveWindowDrift,
    gateway,
    inventory,
    metrics,
    readiness,
    telemetry
  });
  const counts = countSignalStates(signals);
  const hardBlockedSignal = [policy, propagation, gateway, inventory, telemetry]
    .find((signal) => normalizeContractState(signal?.state, 'missing') === 'blocked')
    || (metrics.state === 'blocked' && readiness.state !== 'settling' ? metrics : null);
  const primarySignal = readiness.state === 'settling' && (!hardBlockedSignal || hardBlockedSignal?.sourceOfTruth === 'compiler metrics snapshot')
    ? {
        key: 'readiness',
        state: readiness.state,
        reason: readiness.reason,
        recommendation: readiness.recommendation,
        sourceOfTruth: readiness.sourceOfTruth
      }
    : pickPrimarySignal(signals);
  const overallState = hardBlockedSignal
    ? 'blocked'
    : readiness.state === 'settling'
      ? 'settling'
      : counts.drifting > 0
        ? 'drifting'
        : counts.watching > 0 || telemetry.state === 'watchful'
          ? 'watching'
          : 'ready';

  const nextAction = primarySignal?.recommendation
    || primarySignal?.reason
    || policy.recommendation
    || propagation.recommendation
    || archiveWindowDrift.recommendation
    || gateway.recommendation
    || inventory.recommendation
    || readiness.recommendation
    || telemetry.recommendation
    || 'Keep observing the canonical observability contract.';

  const reason = primarySignal?.reason
    || readiness.reason
    || propagation.reason
    || archiveWindowDrift.reason
    || policy.reason
    || gateway.reason
    || inventory.reason
    || telemetry.reason
    || 'Observability signals are aligned.';

  const healthy = overallState !== 'blocked' && overallState !== 'drifting';
  const trustworthy = !hardBlockedSignal
    && policy.trustworthy !== false
    && propagation.trustworthy !== false
    && archiveWindowDrift.trustworthy !== false
    && gateway.trustworthy !== false
    && inventory.trustworthy !== false
    && readiness.trustworthy !== false
    && telemetry.state !== 'blocked';
  const actionRequired = overallState !== 'ready';

  return {
    projectPath,
    scopePath,
    focusPath,
    capturedAt: new Date().toISOString(),
    state: overallState,
    ready: overallState === 'ready',
    healthy,
    trustworthy,
    actionRequired,
    inventoryState: inventory.inventoryState,
    policyState: policy.state,
    propagationState: propagation.state,
    gatewayState: gateway.state,
    readinessState: readiness.state,
    telemetryState: telemetry.state,
    metricsState: metrics.state,
    reason,
    nextAction,
    summary: `state=${overallState} | readiness=${readiness.state} | policy=${policy.state} | propagation=${propagation.state} | gateway=${gateway.state} | telemetry=${telemetry.state} | inventory=${inventory.inventoryState} | metrics=${metrics.state}`,
    oneLine: `observability=${overallState} | policy=${policy.state} | propagation=${propagation.state} | readiness=${readiness.state} | telemetry=${telemetry.state}${archiveWindowDrift.state && archiveWindowDrift.state !== 'fresh' ? ` | archive=${archiveWindowDrift.state}:${archiveWindowDrift.archiveDays}d/${archiveWindowDrift.historyDays}d` : ''}`,
    counts,
    signals,
    evidence: {
      healthPanel: compactHealthPanelHealth(healthPanel),
      metrics: compactMetricsHealth(metricsSnapshot),
      archiveWindowDrift,
      inventory: inventoryCompact,
      policy: {
        state: policy.state,
        reason: policy.reason,
        recommendation: policy.recommendation
      },
      propagation: {
        state: propagation.state,
        reason: propagation.reason,
        recommendation: propagation.recommendation
      },
      gateway: {
        state: gateway.state,
        reason: gateway.reason,
        recommendation: gateway.recommendation
      },
      telemetry: {
        state: telemetry.state,
        reason: telemetry.reason,
        recommendation: telemetry.recommendation
      }
    },
    inventory,
    policy,
    propagation,
    archiveWindowDrift,
    gateway,
    readiness,
    telemetry,
    metrics,
    controlPlaneContracts: resolvedControlPlaneContracts,
    dashboardControlPlaneContracts: resolvedDashboardControlPlaneContracts,
    canonicalPromotion: canonicalPromotion || resolvedDashboardControlPlaneContracts.canonicalPromotion || null,
    startupTelemetry: startupTelemetry || null
  };
}

export function summarizeCompilerObservabilityContract(contract = null) {
  if (!contract || typeof contract !== 'object') {
    return null;
  }

  return {
    state: contract.state || 'missing',
    ready: contract.ready === true,
    healthy: contract.healthy === true,
    trustworthy: contract.trustworthy === true,
    actionRequired: contract.actionRequired === true,
    inventoryState: contract.inventoryState || null,
    policyState: contract.policyState || null,
    propagationState: contract.propagationState || null,
    gatewayState: contract.gatewayState || null,
    readinessState: contract.readinessState || null,
    telemetryState: contract.telemetryState || null,
    metricsState: contract.metricsState || null,
    reason: contract.reason || null,
    nextAction: contract.nextAction || null,
    summary: contract.summary || null,
    oneLine: contract.oneLine || null,
    counts: contract.counts || null,
    signals: Array.isArray(contract.signals)
      ? contract.signals.slice(0, 7).map((signal) => ({
          key: signal.key || null,
          state: signal.state || null,
          reason: signal.reason || null,
          recommendation: signal.recommendation || null,
          sourceOfTruth: signal.sourceOfTruth || null
        }))
      : []
  };
}

export default {
  buildCompilerObservabilityContract,
  summarizeCompilerObservabilityContract
};
