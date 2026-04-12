/**
 * Canonical observability contract for compiler/runtime surfaces.
 *
 * This layer does not invent new diagnostics. It composes the existing
 * propagation, policy, inventory, metrics, readiness and telemetry signals
 * into one actionable contract so status/inventory/metrics consumers can ask
 * a single question: "is the system connected, coherent and ready?"
 */

import { asNumber } from './core-utils.js';
import { normalizeCount } from './contract-helpers.js';
import {
  resolveControlPlaneContracts,
  resolveDashboardControlPlaneContracts
} from './status-control-plane-contracts.js';
import {
  isBlockedState,
  isDriftingState,
  isWatchingState,
  normalizeState
} from './signal-state-helpers.js';

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function isWatchfulState(state) {
  return isWatchingState(state) || normalizeState(state) === 'deferred';
}

function compactHealthPanelHealth(healthPanel = null) {
  const now = healthPanel?.now || {};
  const trend = healthPanel?.trend || {};

  return {
    status: healthPanel?.status || null,
    headline: healthPanel?.headline || null,
    healthScore: asNumber(now.healthScore, 0),
    healthGrade: now.healthGrade || null,
    globalHealthScore: asNumber(now.globalHealthScore, 0),
    globalHealthGrade: now.globalHealthGrade || null,
    reliabilityScore: asNumber(now.reliabilityScore, 0),
    reliabilityGrade: now.reliabilityGrade || null,
    successScore: asNumber(now.successScore, 0),
    successThreshold: asNumber(now.successThreshold, 0),
    mvpReady: now.mvpReady === true,
    behaviorState: now.behaviorState || null,
    readinessReason: now.readinessReason || null,
    driftState: now.driftState || null,
    trendStatus: trend.status || null,
    trendSummary: trend.summary || null
  };
}

function compactMetricsHealth(metricsSnapshot = null) {
  const current = metricsSnapshot?.current || {};
  const summaryCoherence = metricsSnapshot?.summaryCoherence || current.summaryCoherence || null;

  return {
    healthScore: asNumber(current.healthScore, 0),
    healthGrade: current.healthGrade || null,
    globalHealthScore: asNumber(current.globalHealthScore, 0),
    globalHealthGrade: current.globalHealthGrade || null,
    reliabilityScore: asNumber(current.reliabilityScore, 0),
    reliabilityGrade: current.reliabilityGrade || null,
    successScore: asNumber(current.successScore, 0),
    successThreshold: asNumber(current.successThreshold, 0),
    mvpReady: current.mvpReady === true,
    behaviorState: current.behaviorState || null,
    readinessReason: current.readinessReason || null,
    driftState: current.driftState || null,
    activeAtomsDriftState: current.activeAtomsDriftState || null,
    summaryCoherenceState: summaryCoherence?.coherent === false ? 'stale' : summaryCoherence?.coherent === true ? 'fresh' : null,
    summaryCoherenceReason: summaryCoherence?.reason || null,
    summary: current.summaryText || metricsSnapshot?.summary || null
  };
}

function compactInventorySignals(systemInventory = null) {
  const summary = systemInventory?.summary || {};
  return {
    inventoryState: summary.inventoryState || systemInventory?.inventoryState || 'missing',
    policyCoverageState: summary.policyCoverageState || systemInventory?.policyCoverageState || null,
    policyCoverageScore: asNumber(summary.policyCoverageScore || systemInventory?.policyCoverageScore, 0),
    policyCoverageRatio: Number(firstDefined(summary.policyCoverageRatio, systemInventory?.policyCoverageRatio, 0)) || 0,
    policyDriftCount: asNumber(summary.policyDriftCount || systemInventory?.policyDriftCount, 0),
    missingCanonicalApiCount: asNumber(summary.missingCanonicalApiCount || systemInventory?.missingCanonicalApiCount, 0),
    missingCanonicalSurfaceCount: asNumber(summary.missingCanonicalSurfaceCount || systemInventory?.missingCanonicalSurfaceCount, 0),
    standardizationGapCount: asNumber(summary.standardizationGapCount || systemInventory?.standardizationGapCount, 0),
    integrationCoveragePct: asNumber(summary.integrationCoveragePct || systemInventory?.integrationCoveragePct, 0),
    metadataCoveragePct: asNumber(
      summary.metadataFieldCoveragePct
        || summary.metadataCoveragePct
        || systemInventory?.metadataFieldCoveragePct
        || systemInventory?.metadataCoveragePct,
      0
    ),
    historyStoreState: summary.historyStoreState || systemInventory?.historyStoreState || null,
    historyStoreCount: asNumber(summary.historyStoreCount || systemInventory?.historyStoreCount, 0),
    nextAction: summary.nextAction || systemInventory?.nextAction || null
  };
}

function compactTelemetryState(startupTelemetry, proxyRuntimeTelemetry, bridgeRuntimeTelemetry) {
  const telemetry = [startupTelemetry, proxyRuntimeTelemetry, bridgeRuntimeTelemetry].filter(Boolean);
  const states = telemetry.map((item) => normalizeState(item?.state, 'missing'));
  const hasProxy = Boolean(proxyRuntimeTelemetry);
  const hasBridge = Boolean(bridgeRuntimeTelemetry);

  if (telemetry.length === 0) {
    return {
      state: 'deferred',
      healthy: true,
      trustworthy: true,
      reason: 'Runtime telemetry was not provided to this snapshot.',
      recommendation: 'Use the status surface to attach startup, proxy and bridge telemetry when you need runtime readiness.',
      sourceCount: 0,
      states: []
    };
  }

  if (states.some(isBlockedState)) {
    return {
      state: 'blocked',
      healthy: false,
      trustworthy: false,
      reason: 'One or more runtime telemetry surfaces report a blocked or thrashing state.',
      recommendation: 'Inspect proxy/bridge runtime telemetry before trusting restart or reconnect readiness.',
      sourceCount: telemetry.length,
      states
    };
  }

  const missingCount = states.filter((state) => state === 'missing').length;
  if ((hasProxy || hasBridge) && missingCount > 0) {
    return {
      state: 'partial',
      healthy: false,
      trustworthy: true,
      reason: 'Runtime telemetry is partially available but not all runtime surfaces are reporting.',
      recommendation: 'Attach startup, proxy and bridge telemetry together so transport health can be interpreted in one place.',
      sourceCount: telemetry.length,
      states
    };
  }

  if (states.some((state) => ['watchful', 'recovering', 'recovery', 'watching'].includes(state))) {
    return {
      state: 'watchful',
      healthy: true,
      trustworthy: true,
      reason: 'Runtime telemetry shows recovery or watchful transport activity.',
      recommendation: 'Keep bridge and proxy recovery telemetry persisted so transport regressions remain visible.',
      sourceCount: telemetry.length,
      states
    };
  }

  if (states.some(isDriftingState)) {
    return {
      state: 'partial',
      healthy: false,
      trustworthy: true,
      reason: 'Runtime telemetry is present but not all surfaces are reporting fresh values.',
      recommendation: 'Keep startup, proxy and bridge telemetry aligned so readiness can be assessed consistently.',
      sourceCount: telemetry.length,
      states
    };
  }

  return {
    state: 'ready',
    healthy: true,
    trustworthy: true,
    reason: 'Runtime telemetry surfaces are aligned and stable.',
    recommendation: 'Keep runtime telemetry persisted so transport regressions remain visible.',
    sourceCount: telemetry.length,
    states
  };
}

function summarizePropagationState({
  propagationExpansion = null,
  folderizationPropagation = null,
  policyCoverage = null
} = {}) {
  const expansionState = normalizeState(propagationExpansion?.state, 'missing');
  const folderDecision = normalizeState(folderizationPropagation?.decision, 'missing');

  if (isBlockedState(expansionState)) {
    return {
      state: 'blocked',
      healthy: false,
      trustworthy: false,
      reason: propagationExpansion?.reason || 'Propagation expansion is blocked.',
      recommendation: propagationExpansion?.recommendation || 'Attach the canonical propagation plan before trusting reporting payloads.',
      sourceOfTruth: 'compiler drift assessment'
    };
  }

  if (expansionState === 'fresh' || expansionState === 'stable') {
    return {
      state: 'fresh',
      healthy: true,
      trustworthy: true,
      reason: propagationExpansion?.reason || 'Propagation expansion is fresh.',
      recommendation: propagationExpansion?.recommendation || 'Keep watcher and tool surfaces attached to the canonical propagation engine.',
      sourceOfTruth: 'compiler drift assessment'
    };
  }

  if (expansionState === 'stale' || expansionState === 'partial') {
    return {
      state: expansionState,
      healthy: false,
      trustworthy: false,
      reason: propagationExpansion?.reason || 'Propagation expansion is not fresh.',
      recommendation: propagationExpansion?.recommendation || 'Attach the canonical propagation plan before trusting reporting payloads.',
      sourceOfTruth: 'compiler drift assessment'
    };
  }

  if (folderDecision !== 'missing') {
    if (['approve', 'accepted', 'allow', 'keep'].includes(folderDecision)) {
      return {
        state: 'fresh',
        healthy: true,
        trustworthy: true,
        reason: folderizationPropagation?.summary || 'Folderization propagation is approved.',
        recommendation: folderizationPropagation?.recommendationStrategy
          || 'Keep the canonical propagation plan attached to downstream consumers.',
        sourceOfTruth: 'folderization propagation'
      };
    }

    if (['review', 'pending', 'watch', 'watchful'].includes(folderDecision)) {
      return {
        state: 'watching',
        healthy: true,
        trustworthy: true,
        reason: folderizationPropagation?.summary || 'Folderization propagation is under review.',
        recommendation: folderizationPropagation?.recommendationStrategy
          || 'Review the canonical propagation plan before promoting more surfaces.',
        sourceOfTruth: 'folderization propagation'
      };
    }

    if (['reject', 'blocked', 'deny', 'decline'].includes(folderDecision)) {
      return {
        state: 'blocked',
        healthy: false,
        trustworthy: false,
        reason: folderizationPropagation?.summary || 'Folderization propagation was rejected.',
        recommendation: folderizationPropagation?.recommendationStrategy
          || 'Repair the canonical propagation plan before trusting downstream consumers.',
        sourceOfTruth: 'folderization propagation'
      };
    }
  }

  const coverageState = normalizeState(policyCoverage?.state || policyCoverage?.coverageState, 'missing');
  if (coverageState === 'fresh') {
    return {
      state: 'fresh',
      healthy: true,
      trustworthy: true,
      reason: policyCoverage?.nextAction || 'No propagation drift detected.',
      recommendation: policyCoverage?.nextAction || 'Keep routing propagation through the canonical shared helpers.',
      sourceOfTruth: 'policy coverage'
    };
  }

  if (coverageState === 'blocked' || coverageState === 'stale') {
    return {
      state: coverageState,
      healthy: false,
      trustworthy: false,
      reason: policyCoverage?.nextAction || 'Propagation coverage is not fresh.',
      recommendation: policyCoverage?.nextAction || 'Reconcile propagation coverage before trusting watcher or status payloads.',
      sourceOfTruth: 'policy coverage'
    };
  }

  return {
    state: 'missing',
    healthy: false,
    trustworthy: false,
    reason: 'No canonical propagation signal is available.',
    recommendation: 'Attach the canonical propagation plan before emitting watcher or reporting payloads.',
    sourceOfTruth: 'compiler propagation'
  };
}

function summarizeGatewayState(compilerExplainability = null, controlPlaneContracts = null) {
  const dataGatewayContract = compilerExplainability?.dataGatewayContract || null;
  const trustworthy = dataGatewayContract?.summary?.trustworthy === true;
  const primaryIssue = dataGatewayContract?.summary?.primaryIssue || null;
  const state = trustworthy
    ? 'fresh'
    : normalizeState(primaryIssue?.state, dataGatewayContract ? 'stale' : 'missing');

  return {
    state,
    healthy: trustworthy,
    trustworthy,
    reason: primaryIssue?.reason || dataGatewayContract?.summary?.nextAction || 'Data gateway contract needs attention.',
    recommendation: dataGatewayContract?.summary?.nextAction || 'Route freshness, coverage and drift checks through the canonical data gateway contract.',
    sourceOfTruth: 'data gateway contract',
    integrationCoveragePct: asNumber(controlPlaneContracts?.integrationCoveragePct, 0)
  };
}

function summarizePolicyState(controlPlaneContracts = null, compilerExplainability = null) {
  const policyCoverage = controlPlaneContracts?.policyCoverage || compilerExplainability?.policyCoverage || null;
  const driftAssessment = compilerExplainability?.driftAssessment || null;
  const state = normalizeState(policyCoverage?.state || policyCoverage?.coverageState, 'missing');
  const propagationExpansion = driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')
    || (driftAssessment?.primaryIssue?.key === 'propagation_expansion' ? driftAssessment.primaryIssue : null);

  return {
    state,
    healthy: state === 'fresh',
    trustworthy: state === 'fresh',
    reason: policyCoverage?.nextAction || propagationExpansion?.reason || 'Policy coverage is not fresh.',
    recommendation: policyCoverage?.nextAction || propagationExpansion?.recommendation || 'Resolve policy drift before trusting downstream snapshot consumers.',
    sourceOfTruth: 'policy coverage',
    policyCoverage
  };
}

function summarizeMetricsState(metricsSnapshot = null, healthDashboard = null) {
  const current = metricsSnapshot?.current || {};
  const health = healthDashboard?.health || {};
  const summaryCoherence = metricsSnapshot?.summaryCoherence || current.summaryCoherence || null;
  const score = asNumber(firstDefined(current.globalHealthScore, current.healthScore, health.globalHealthScore, health.healthScore, 0), 0);
  const reliability = asNumber(firstDefined(current.reliabilityScore, health.reliabilityScore, 0), 0);
  const success = asNumber(firstDefined(current.successScore, health.successScore, 0), 0);
  const behaviorState = normalizeState(firstDefined(current.behaviorState, health.behaviorState, 'missing'));
  const readinessReason = firstDefined(current.readinessReason, health.readinessReason, null);

  let state = 'fresh';
  if (behaviorState === 'blocked') {
    state = 'blocked';
  } else if (score < 80 || reliability < 70 || success < 70) {
    state = 'stale';
  } else if (score < 95 || reliability < 90 || success < 90) {
    state = 'watching';
  }

  if (summaryCoherence?.coherent === false && state !== 'blocked') {
    state = 'watching';
  }

  return {
    state,
    healthy: state === 'fresh' || state === 'watching',
    trustworthy: state !== 'blocked',
    reason: readinessReason || summaryCoherence?.reason || health?.summary || current.summaryText || 'Metrics are not fully fresh.',
    recommendation: summaryCoherence?.recommendation || readinessReason || 'Keep using the canonical metrics snapshot so derived reports stay coherent.',
    sourceOfTruth: 'compiler metrics snapshot',
    score,
    reliability,
    success,
    behaviorState,
    summaryCoherenceState: summaryCoherence?.coherent === false ? 'stale' : summaryCoherence?.coherent === true ? 'fresh' : null,
    summaryCoherenceReason: summaryCoherence?.reason || null
  };
}

function summarizeReadinessState(healthPanel = null, healthDashboard = null) {
  const now = healthPanel?.now || healthDashboard?.health || {};
  const trend = healthPanel?.trend || healthDashboard?.trend || {};
  const summaryText = healthPanel?.summary || healthDashboard?.summary || null;
  const readinessReason = firstDefined(now.readinessReason, now.summaryText, healthDashboard?.health?.readinessReason, null);
  const behaviorState = normalizeState(now.behaviorState, 'missing');
  const trendStatus = normalizeState(trend.status, 'missing');
  const mvpReady = now.mvpReady === true;
  const settlingReason = [summaryText, trend.summary, readinessReason].find((text) => typeof text === 'string' && /settling|baseline/i.test(text));

  if (mvpReady && trendStatus !== 'settling' && behaviorState !== 'blocked') {
    return {
      state: 'ready',
      healthy: true,
      trustworthy: true,
      reason: readinessReason || 'The control plane is ready.',
      recommendation: 'Keep tracking the readiness baseline for regressions.',
      sourceOfTruth: 'health dashboard'
    };
  }

  if (trendStatus === 'settling' || settlingReason) {
    return {
      state: 'settling',
      healthy: true,
      trustworthy: true,
      reason: readinessReason || settlingReason || trend.summary || 'Bootstrap trend is still settling.',
      recommendation: 'Wait for the bootstrap baseline to mature before treating readiness as final.',
      sourceOfTruth: 'health dashboard'
    };
  }

  if (behaviorState === 'blocked') {
    return {
      state: 'blocked',
      healthy: false,
      trustworthy: false,
      reason: readinessReason || summaryText || 'The control plane is blocked.',
      recommendation: 'Inspect the blockers in the health dashboard before trusting readiness.',
      sourceOfTruth: 'health dashboard'
    };
  }

  if (behaviorState === 'watchful' || trendStatus === 'watchful') {
    return {
      state: 'watching',
      healthy: true,
      trustworthy: true,
      reason: readinessReason || trend.summary || 'The control plane is watchful.',
      recommendation: 'Keep observing the current baseline until the control plane is fully mature.',
      sourceOfTruth: 'health dashboard'
    };
  }

  return {
    state: mvpReady ? 'watching' : 'missing',
    healthy: mvpReady === true,
    trustworthy: mvpReady === true,
    reason: readinessReason || summaryText || 'Readiness information is incomplete.',
    recommendation: mvpReady
      ? 'Keep observing the current baseline.'
      : 'Review the health dashboard before trusting readiness.',
    sourceOfTruth: 'health dashboard'
  };
}

function buildObservabilitySignals({
  policy,
  propagation,
  gateway,
  inventory,
  metrics,
  readiness,
  telemetry
} = {}) {
  return [
    {
      key: 'policy',
      state: policy.state,
      healthy: policy.healthy,
      trustworthy: policy.trustworthy,
      reason: policy.reason,
      recommendation: policy.recommendation,
      sourceOfTruth: policy.sourceOfTruth
    },
    {
      key: 'propagation',
      state: propagation.state,
      healthy: propagation.healthy,
      trustworthy: propagation.trustworthy,
      reason: propagation.reason,
      recommendation: propagation.recommendation,
      sourceOfTruth: propagation.sourceOfTruth
    },
    {
      key: 'gateway',
      state: gateway.state,
      healthy: gateway.healthy,
      trustworthy: gateway.trustworthy,
      reason: gateway.reason,
      recommendation: gateway.recommendation,
      sourceOfTruth: gateway.sourceOfTruth
    },
    {
      key: 'inventory',
      state: inventory.state,
      healthy: inventory.healthy,
      trustworthy: inventory.trustworthy,
      reason: inventory.reason,
      recommendation: inventory.recommendation,
      sourceOfTruth: inventory.sourceOfTruth
    },
    {
      key: 'metrics',
      state: metrics.state,
      healthy: metrics.healthy,
      trustworthy: metrics.trustworthy,
      reason: metrics.reason,
      recommendation: metrics.recommendation,
      sourceOfTruth: metrics.sourceOfTruth
    },
    {
      key: 'readiness',
      state: readiness.state,
      healthy: readiness.healthy,
      trustworthy: readiness.trustworthy,
      reason: readiness.reason,
      recommendation: readiness.recommendation,
      sourceOfTruth: readiness.sourceOfTruth
    },
    {
      key: 'telemetry',
      state: telemetry.state,
      healthy: telemetry.healthy,
      trustworthy: telemetry.trustworthy,
      reason: telemetry.reason,
      recommendation: telemetry.recommendation,
      sourceOfTruth: telemetry.sourceOfTruth
    }
  ];
}

function countSignalStates(signals = []) {
  const counts = {
    total: signals.length,
    blocked: 0,
    drifting: 0,
    watching: 0,
    ready: 0,
    deferred: 0
  };

  for (const signal of signals) {
    const state = normalizeState(signal?.state, 'missing');
    if (state === 'ready' || state === 'fresh' || state === 'stable') {
      counts.ready += 1;
    } else if (state === 'blocked') {
      counts.blocked += 1;
    } else if (state === 'deferred') {
      counts.deferred += 1;
    } else if (isDriftingState(state)) {
      counts.drifting += 1;
    } else if (isWatchfulState(state)) {
      counts.watching += 1;
    } else {
      counts.drifting += 1;
    }
  }

  return counts;
}

function pickPrimarySignal(signals = []) {
  return signals.find((signal) => normalizeState(signal?.state, 'missing') === 'blocked')
    || signals.find((signal) => normalizeState(signal?.state, 'missing') === 'stale')
    || signals.find((signal) => normalizeState(signal?.state, 'missing') === 'missing')
    || signals.find((signal) => normalizeState(signal?.state, 'missing') === 'partial')
    || signals.find((signal) => normalizeState(signal?.state, 'missing') === 'settling')
    || signals.find((signal) => normalizeState(signal?.state, 'missing') === 'watching')
    || null;
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
  const inventoryState = normalizeState(inventoryCompact.inventoryState, 'missing');
  const inventoryIssueCount = normalizeCount(inventoryCompact.policyDriftCount)
    + normalizeCount(inventoryCompact.missingCanonicalApiCount)
    + normalizeCount(inventoryCompact.missingCanonicalSurfaceCount)
    + normalizeCount(inventoryCompact.standardizationGapCount);

  const inventory = {
    state: inventoryIssueCount > 0
      ? (inventoryIssueCount >= 5 ? 'blocked' : inventoryIssueCount >= 3 ? 'stale' : 'watching')
      : 'fresh',
    healthy: inventoryIssueCount < 3,
    trustworthy: inventoryIssueCount < 3,
    reason: inventoryIssueCount > 0
      ? 'Inventory is missing canonical surfaces or still carries policy drift.'
      : inventoryCompact.nextAction || 'Canonical inventory surfaces are aligned.',
    recommendation: inventoryCompact.nextAction
      || 'Keep adopting the existing canonical families consistently.',
    sourceOfTruth: 'system inventory',
    inventoryState,
    inventoryIssueCount,
    policyCoverageState: inventoryCompact.policyCoverageState || policy.state || null,
    policyCoverageScore: inventoryCompact.policyCoverageScore || 0,
    integrationCoveragePct: inventoryCompact.integrationCoveragePct || 0,
    metadataCoveragePct: inventoryCompact.metadataCoveragePct || 0,
    historyStoreState: inventoryCompact.historyStoreState || null,
    historyStoreCount: inventoryCompact.historyStoreCount || 0
  };

  const signals = buildObservabilitySignals({
    policy,
    propagation,
    gateway,
    inventory,
    metrics,
    readiness,
    telemetry
  });
  const counts = countSignalStates(signals);
  const hardBlockedSignal = [policy, propagation, gateway, inventory, telemetry]
    .find((signal) => normalizeState(signal?.state, 'missing') === 'blocked')
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
    || gateway.recommendation
    || inventory.recommendation
    || readiness.recommendation
    || telemetry.recommendation
    || 'Keep observing the canonical observability contract.';

  const reason = primarySignal?.reason
    || readiness.reason
    || propagation.reason
    || policy.reason
    || gateway.reason
    || inventory.reason
    || telemetry.reason
    || 'Observability signals are aligned.';

  const healthy = overallState !== 'blocked' && overallState !== 'drifting';
  const trustworthy = !hardBlockedSignal
    && policy.trustworthy !== false
    && propagation.trustworthy !== false
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
    oneLine: `observability=${overallState} | policy=${policy.state} | propagation=${propagation.state} | readiness=${readiness.state} | telemetry=${telemetry.state}`,
    counts,
    signals,
    evidence: {
      healthPanel: compactHealthPanelHealth(healthPanel),
      metrics: compactMetricsHealth(metricsSnapshot),
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
