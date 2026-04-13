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
import { buildTelemetryRegistry } from './telemetry.js';
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

function summarizeSystems(systems) {
  if (!systems) return null;
  return {
    state: systems.state || 'missing',
    total: systems.total || 0,
    canonical: systems.canonical || 0,
    emergent: systems.emergent || 0,
    bridge: systems.bridge || 0,
    wrapper: systems.wrapper || 0,
    metadataCoveragePct: systems.metadataCoveragePct || 0,
    integrationCoveragePct: systems.integrationCoveragePct || 0
  };
}

function summarizeTelemetry(telemetry) {
  if (!telemetry) return null;
  return {
    state: telemetry.state || 'missing',
    requiredCount: telemetry.requiredCount || 0,
    requiredSatisfiedCount: telemetry.requiredSatisfiedCount || 0,
    requiredMissingCount: telemetry.requiredMissingCount || 0,
    optionalMissingCount: telemetry.optionalMissingCount || 0,
    blockedCount: telemetry.blockedCount || 0,
    nextAction: telemetry.nextAction || null
  };
}

function summarizePropagation(propagation) {
  if (!propagation) return null;
  return {
    state: propagation.state || 'missing',
    expectedSystemCount: propagation.expectedSystemCount || 0,
    surfacedSystemCount: propagation.surfacedSystemCount || 0,
    missingSystemCount: propagation.missingSystemCount || 0,
    coverageRatio: propagation.coverageRatio || 0,
    missingSystemNames: takeSample(propagation.missingSystemNames || [], 8),
    recommendation: propagation.recommendation || null
  };
}

function summarizeGaps(gaps) {
  if (!Array.isArray(gaps)) return [];
  return gaps.slice(0, 5).map((gap) => ({
    key: gap.key || null,
    state: gap.state || null,
    severity: gap.severity || null,
    count: gap.count || 0,
    reason: gap.reason || null,
    recommendation: gap.recommendation || null
  }));
}

function summarizeSignals(signals) {
  if (!Array.isArray(signals)) return [];
  return signals.slice(0, 8).map((signal) => ({
    key: signal.key || null,
    state: signal.state || null,
    severity: signal.severity || null,
    reason: signal.reason || null,
    recommendation: signal.recommendation || null
  }));
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
    systems: summarizeSystems(controlPlane.systems),
    telemetry: summarizeTelemetry(controlPlane.telemetry),
    metricAlignment: summarizeMetricAlignment(controlPlane.metricAlignment || null),
    alignmentSummary: controlPlane.alignmentSummary || null,
    propagation: summarizePropagation(controlPlane.propagation),
    topGaps: summarizeGaps(controlPlane.gaps),
    signals: summarizeSignals(controlPlane.signals)
  };
}

export default {
  buildCompilerControlPlane,
  summarizeCompilerControlPlane
};
