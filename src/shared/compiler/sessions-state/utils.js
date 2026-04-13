/**
 * @fileoverview Shared utilities for MCP session metrics and transport analysis.
 * Leaf functions with no internal dependencies.
 *
 * @module shared/compiler/sessions-state/utils
 */

import { asNumber } from '../core-utils.js';

export function resolveSessionSyncGraceMs() {
  return 30000; // 30 seconds default
}

export function isRecentSessionActivityObserved(sessionSnapshot, sessionSyncGraceMs = resolveSessionSyncGraceMs()) {
  if (!sessionSnapshot) return false;

  const latestUpdatedAtAgeMs = sessionSnapshot.latestUpdatedAtAgeMs;
  const latestActiveUpdatedAtAgeMs = sessionSnapshot.latestActiveUpdatedAtAgeMs;

  return (
    asNumber(sessionSnapshot.recentSessionCount, 0) > 0
    || asNumber(sessionSnapshot.recentActiveCount, 0) > 0
    || (Number.isFinite(latestUpdatedAtAgeMs) && latestUpdatedAtAgeMs <= sessionSyncGraceMs)
    || (Number.isFinite(latestActiveUpdatedAtAgeMs) && latestActiveUpdatedAtAgeMs <= sessionSyncGraceMs)
  );
}

export function resolveSessionCountDrift({
  hasRuntimeSessionCount = false,
  runtimeSessionCount = 0,
  totalPersistentActive = 0,
  sessionSnapshot = null,
  sessionSyncGraceMs = resolveSessionSyncGraceMs()
} = {}) {
  return hasRuntimeSessionCount
    ? totalPersistentActive === 0 && runtimeSessionCount > 0 && !isRecentSessionActivityObserved(sessionSnapshot, sessionSyncGraceMs)
    : false;
}

export function normalizeTransportOriginCounts(transportOriginCounts = {}) {
  return Object.entries(transportOriginCounts)
    .map(([origin, count]) => ({
      origin: String(origin || 'unknown').trim() || 'unknown',
      count: asNumber(count, 0)
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.origin.localeCompare(right.origin));
}

export function normalizeTransportCountMap(countMap = {}) {
  return Object.entries(countMap)
    .reduce((acc, [key, count]) => {
      const normalizedKey = String(key || 'unknown').trim() || 'unknown';
      const normalizedCount = asNumber(count, 0);
      if (normalizedCount > 0) {
        acc[normalizedKey] = normalizedCount;
      }
      return acc;
    }, {});
}

export function buildTransportAlert({
  code,
  severity = 'medium',
  state = 'watchful',
  reason,
  recommendation,
  evidence = {}
} = {}) {
  return {
    code,
    severity,
    state,
    blocking: state === 'blocked',
    reason,
    recommendation,
    evidence
  };
}

export function summarizeTransportAlertState(alerts = [], hasKnownProvenance = false) {
  if (!hasKnownProvenance) {
    return 'missing';
  }

  if (!Array.isArray(alerts) || alerts.length === 0) {
    return 'fresh';
  }

  return alerts.some((alert) => alert.state === 'blocked') ? 'blocked' : 'watchful';
}
