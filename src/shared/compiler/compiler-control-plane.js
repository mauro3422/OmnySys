import { takeSample } from './sample-helpers.js';
import {
  buildMetricAlignmentSignal,
  summarizeMetricAlignment
} from './metric-alignment-summary.js';
import {
  isBlockedState,
  isDriftingState,
  isWatchingState
} from './signal-state-helpers.js';
import {
  buildContractEntries,
  buildPropagationRegistry,
  buildSignalEntries,
  buildSystemRegistry
} from './compiler-control-plane-structure.js';
import { buildTelemetryRegistry } from './compiler-control-plane-telemetry.js';
import {
  buildGapEntries,
  buildSummary,
  deriveControlPlaneState
} from './compiler-control-plane-gaps.js';

export function buildCompilerControlPlane({
  projectPath = null,
  scopePath = null,
  focusPath = null,
  compilerExplainability = null,
  systemInventoryDetail = null,
  systemInventory = null,
  canonicalPromotion = null,
  metricsSnapshot = null,
  healthDashboard = null,
  healthPanel = null,
  observability = null,
  startupTelemetry = null,
  proxyRuntimeTelemetry = null,
  bridgeRuntimeTelemetry = null
} = {}) {
  const systems = buildSystemRegistry(systemInventoryDetail, systemInventory);
  const metricAlignment = buildMetricAlignmentSignal({
    compilerExplainability,
    systemInventory,
    current: metricsSnapshot?.current || null,
    bridgeCallReliability: metricsSnapshot?.current?.bridgeCallReliability || null,
    trust: observability?.trust || null
  });
  const contracts = buildContractEntries({
    compilerExplainability,
    systemInventory,
    canonicalPromotion,
    observability,
    metricAlignment
  });
  const signals = buildSignalEntries({
    compilerExplainability,
    observability,
    systemInventory,
    current: metricsSnapshot?.current || null,
    bridgeCallReliability: metricsSnapshot?.current?.bridgeCallReliability || null,
    trust: observability?.trust || null
  });
  const telemetry = buildTelemetryRegistry({
    compilerExplainability,
    systemInventory,
    metricsSnapshot,
    healthDashboard,
    healthPanel,
    startupTelemetry,
    proxyRuntimeTelemetry,
    bridgeRuntimeTelemetry
  });
  const propagation = buildPropagationRegistry(compilerExplainability, systemInventory);
  const gaps = buildGapEntries({
    systemInventory,
    compilerExplainability,
    telemetry,
    propagation,
    signals,
    metricAlignment,
    current: metricsSnapshot?.current || null
  }).sort((left, right) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[left.severity] ?? 99) - (order[right.severity] ?? 99);
  });
  const state = deriveControlPlaneState(gaps, signals);
  const summary = buildSummary(state, gaps, telemetry, propagation, systems);

  return {
    projectPath,
    scopePath,
    focusPath,
    capturedAt: new Date().toISOString(),
    state,
    healthy: state === 'ready' || state === 'watching',
    trustworthy: state === 'ready',
    actionRequired: state !== 'ready',
    systems,
    contracts: {
      total: contracts.length,
      entries: contracts
    },
    signals,
    telemetry,
    metricAlignment,
    propagation,
    gaps,
    counts: {
      systemCount: systems.total,
      contractCount: contracts.length,
      signalCount: signals.length,
      gapCount: gaps.length,
      alignedSignalCount: signals.filter((signal) => signal.key === 'metric_alignment' && signal.state === 'fresh').length,
      blockedSignalCount: signals.filter((signal) => isBlockedState(signal.state)).length,
      driftingSignalCount: signals.filter((signal) => isDriftingState(signal.state)).length,
      watchingSignalCount: signals.filter((signal) => isWatchingState(signal.state)).length
    },
    nextAction: summary.nextAction,
    reason: summary.reason,
    summaryText: summary.summaryText,
    oneLine: summary.oneLine,
    alignmentSummary: summarizeMetricAlignment(metricAlignment)
  };
}

export function summarizeCompilerControlPlane(controlPlane = null) {
  if (!controlPlane || typeof controlPlane !== 'object') {
    return null;
  }

  return {
    state: controlPlane.state || 'missing',
    healthy: controlPlane.healthy === true,
    trustworthy: controlPlane.trustworthy === true,
    actionRequired: controlPlane.actionRequired === true,
    nextAction: controlPlane.nextAction || null,
    reason: controlPlane.reason || null,
    summaryText: controlPlane.summaryText || null,
    oneLine: controlPlane.oneLine || null,
    counts: controlPlane.counts || null,
    systems: controlPlane.systems ? {
      state: controlPlane.systems.state || 'missing',
      total: controlPlane.systems.total || 0,
      canonical: controlPlane.systems.canonical || 0,
      emergent: controlPlane.systems.emergent || 0,
      bridge: controlPlane.systems.bridge || 0,
      wrapper: controlPlane.systems.wrapper || 0,
      metadataCoveragePct: controlPlane.systems.metadataCoveragePct || 0,
      integrationCoveragePct: controlPlane.systems.integrationCoveragePct || 0
    } : null,
    telemetry: controlPlane.telemetry ? {
      state: controlPlane.telemetry.state || 'missing',
      requiredCount: controlPlane.telemetry.requiredCount || 0,
      requiredSatisfiedCount: controlPlane.telemetry.requiredSatisfiedCount || 0,
      requiredMissingCount: controlPlane.telemetry.requiredMissingCount || 0,
      optionalMissingCount: controlPlane.telemetry.optionalMissingCount || 0,
      blockedCount: controlPlane.telemetry.blockedCount || 0,
      nextAction: controlPlane.telemetry.nextAction || null
    } : null,
    metricAlignment: summarizeMetricAlignment(controlPlane.metricAlignment || null),
    alignmentSummary: controlPlane.alignmentSummary || null,
    propagation: controlPlane.propagation ? {
      state: controlPlane.propagation.state || 'missing',
      expectedSystemCount: controlPlane.propagation.expectedSystemCount || 0,
      surfacedSystemCount: controlPlane.propagation.surfacedSystemCount || 0,
      missingSystemCount: controlPlane.propagation.missingSystemCount || 0,
      coverageRatio: controlPlane.propagation.coverageRatio || 0,
      missingSystemNames: takeSample(controlPlane.propagation.missingSystemNames || [], 8),
      recommendation: controlPlane.propagation.recommendation || null
    } : null,
    topGaps: Array.isArray(controlPlane.gaps)
      ? controlPlane.gaps.slice(0, 5).map((gap) => ({
          key: gap.key || null,
          state: gap.state || null,
          severity: gap.severity || null,
          count: gap.count || 0,
          reason: gap.reason || null,
          recommendation: gap.recommendation || null
        }))
      : [],
    signals: Array.isArray(controlPlane.signals)
      ? controlPlane.signals.slice(0, 8).map((signal) => ({
          key: signal.key || null,
          state: signal.state || null,
          severity: signal.severity || null,
          reason: signal.reason || null,
          recommendation: signal.recommendation || null
        }))
      : []
  };
}

export default {
  buildCompilerControlPlane,
  summarizeCompilerControlPlane
};
