/**
 * Readiness state summarization helpers.
 * Extracted from compiler-observability-contract.js to reduce complexity.
 */

import { normalizeState } from './signal-state-helpers.js';

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

function isSettlingText(text) {
  return typeof text === 'string' && /settling|baseline/i.test(text);
}

function buildReadyState(reason) {
  return {
    state: 'ready',
    healthy: true,
    trustworthy: true,
    reason: reason || 'The control plane is ready.',
    recommendation: 'Keep tracking the readiness baseline for regressions.',
    sourceOfTruth: 'health dashboard'
  };
}

function buildSettlingState(reason, trendSummary) {
  return {
    state: 'settling',
    healthy: true,
    trustworthy: true,
    reason: reason || trendSummary || 'Bootstrap trend is still settling.',
    recommendation: 'Wait for the bootstrap baseline to mature before treating readiness as final.',
    sourceOfTruth: 'health dashboard'
  };
}

function buildBlockedState(reason, summaryText) {
  return {
    state: 'blocked',
    healthy: false,
    trustworthy: false,
    reason: reason || summaryText || 'The control plane is blocked.',
    recommendation: 'Inspect the blockers in the health dashboard before trusting readiness.',
    sourceOfTruth: 'health dashboard'
  };
}

function buildWatchingState(reason, trendSummary) {
  return {
    state: 'watching',
    healthy: true,
    trustworthy: true,
    reason: reason || trendSummary || 'The control plane is watchful.',
    recommendation: 'Keep observing the current baseline until the control plane is fully mature.',
    sourceOfTruth: 'health dashboard'
  };
}

function buildMissingState(mvpReady, reason, summaryText) {
  return {
    state: mvpReady ? 'watching' : 'missing',
    healthy: mvpReady === true,
    trustworthy: mvpReady === true,
    reason: reason || summaryText || 'Readiness information is incomplete.',
    recommendation: mvpReady
      ? 'Keep observing the current baseline.'
      : 'Review the health dashboard before trusting readiness.',
    sourceOfTruth: 'health dashboard'
  };
}

export function summarizeReadinessState(healthPanel = null, healthDashboard = null) {
  const now = healthPanel?.now || healthDashboard?.health || {};
  const trend = healthPanel?.trend || healthDashboard?.trend || {};
  const summaryText = healthPanel?.summary || healthDashboard?.summary || null;
  const readinessReason = firstDefined(now.readinessReason, now.summaryText, healthDashboard?.health?.readinessReason, null);
  const behaviorState = normalizeState(now.behaviorState, 'missing');
  const trendStatus = normalizeState(trend.status, 'missing');
  const mvpReady = now.mvpReady === true;
  const settlingReason = [summaryText, trend.summary, readinessReason].find(isSettlingText);

  if (mvpReady && trendStatus !== 'settling' && behaviorState !== 'blocked') {
    return buildReadyState(readinessReason);
  }

  if (trendStatus === 'settling' || settlingReason) {
    return buildSettlingState(readinessReason || settlingReason, trend.summary);
  }

  if (behaviorState === 'blocked') {
    return buildBlockedState(readinessReason, summaryText);
  }

  if (behaviorState === 'watchful' || trendStatus === 'watchful') {
    return buildWatchingState(readinessReason, trend.summary);
  }

  return buildMissingState(mvpReady, readinessReason, summaryText);
}
