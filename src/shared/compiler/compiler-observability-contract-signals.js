/**
 * Signal summarizers for the compiler observability contract.
 */

import { asNumber } from './core-utils.js';
import { isBlockedState, isDriftingState, isWatchingState, normalizeState } from './signal-state-helpers.js';

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

export function summarizePropagationState({
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

export function summarizeGatewayState(compilerExplainability = null, controlPlaneContracts = null) {
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

export function summarizePolicyState(controlPlaneContracts = null, compilerExplainability = null) {
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

export function summarizeMetricsState(metricsSnapshot = null, healthDashboard = null) {
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

export function buildObservabilitySignals({
  policy,
  propagation,
  archiveWindowDrift,
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
    archiveWindowDrift ? {
      key: 'archive',
      state: archiveWindowDrift.state,
      healthy: archiveWindowDrift.healthy,
      trustworthy: archiveWindowDrift.trustworthy,
      reason: archiveWindowDrift.reason,
      recommendation: archiveWindowDrift.recommendation,
      sourceOfTruth: 'health archive'
    } : null,
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
  ].filter(Boolean);
}

export function countSignalStates(signals = []) {
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

export function pickPrimarySignal(signals = []) {
  return signals.find((signal) => normalizeState(signal?.state, 'missing') === 'blocked')
    || signals.find((signal) => normalizeState(signal?.state, 'missing') === 'stale')
    || signals.find((signal) => normalizeState(signal?.state, 'missing') === 'missing')
    || signals.find((signal) => normalizeState(signal?.state, 'missing') === 'partial')
    || signals.find((signal) => normalizeState(signal?.state, 'missing') === 'settling')
    || signals.find((signal) => normalizeState(signal?.state, 'missing') === 'watching')
    || null;
}

export default {
  summarizePropagationState,
  summarizeGatewayState,
  summarizePolicyState,
  summarizeMetricsState,
  buildObservabilitySignals,
  countSignalStates,
  pickPrimarySignal
};
