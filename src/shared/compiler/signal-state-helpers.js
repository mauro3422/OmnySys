import { asNumber } from './core-utils.js';

export function normalizeState(value, fallback = 'missing') {
  const state = String(value || '').trim().toLowerCase();
  return state || fallback;
}

export function isBlockedState(state) {
  return ['blocked', 'thrashing', 'failed', 'unhealthy'].includes(normalizeState(state));
}

export function isDriftingState(state) {
  return ['stale', 'partial', 'missing', 'drifting', 'degraded', 'incomplete'].includes(normalizeState(state));
}

export function isWatchingState(state) {
  return ['watching', 'watchful', 'review', 'pending', 'settling'].includes(normalizeState(state));
}

export function severityFromState(state) {
  if (isBlockedState(state)) return 'critical';
  if (isDriftingState(state)) return 'high';
  if (isWatchingState(state)) return 'medium';
  return 'low';
}

export function stateFromCoveragePercent(value) {
  const percent = asNumber(value, 0);
  if (percent >= 95) return 'fresh';
  if (percent >= 80) return 'watching';
  if (percent > 0) return 'stale';
  return 'missing';
}

export default {
  normalizeState,
  isBlockedState,
  isDriftingState,
  isWatchingState,
  severityFromState,
  stateFromCoveragePercent
};
