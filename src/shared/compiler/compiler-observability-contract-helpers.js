/**
 * Shared helpers for the compiler observability contract.
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

export function compactHealthPanelHealth(healthPanel = null) {
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

export function compactMetricsHealth(metricsSnapshot = null) {
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

export function compactInventorySignals(systemInventory = null) {
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

export function compactTelemetryState(startupTelemetry, proxyRuntimeTelemetry, bridgeRuntimeTelemetry) {
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
export default {
  compactHealthPanelHealth,
  compactMetricsHealth,
  compactInventorySignals,
  compactTelemetryState
};
