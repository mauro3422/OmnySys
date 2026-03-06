/**
 * @fileoverview Canonical watcher diagnostics reconciliation helpers.
 *
 * Shared logic to filter/partition alerts by lifecycle so runtime surfaces do
 * not each implement their own stale/expired handling.
 *
 * @module shared/compiler/watcher-issue-reconciliation
 */

import {
  WATCHER_ALERT_LIFECYCLE,
  attachWatcherAlertLifecycle,
  summarizeWatcherAlertLifecycle
} from './watcher-issue-lifecycle.js';

export const WATCHER_LIFECYCLE_FILTER = {
  ALL: 'all',
  ACTIVE: WATCHER_ALERT_LIFECYCLE.ACTIVE,
  STALE: WATCHER_ALERT_LIFECYCLE.STALE,
  EXPIRED: WATCHER_ALERT_LIFECYCLE.EXPIRED,
  STALE_OR_EXPIRED: 'stale_or_expired'
};

export function normalizeWatcherAlertLifecycleFilter(lifecycle = 'all') {
  const normalized = String(lifecycle || 'all').toLowerCase();
  if (Object.values(WATCHER_LIFECYCLE_FILTER).includes(normalized)) {
    return normalized;
  }
  return WATCHER_LIFECYCLE_FILTER.ALL;
}

export function matchesWatcherAlertLifecycle(alert = {}, lifecycle = 'all') {
  const normalized = normalizeWatcherAlertLifecycleFilter(lifecycle);
  const status = alert?.lifecycle?.status || attachWatcherAlertLifecycle(alert).lifecycle.status;

  if (normalized === WATCHER_LIFECYCLE_FILTER.ALL) return true;
  if (normalized === WATCHER_LIFECYCLE_FILTER.STALE_OR_EXPIRED) {
    return status === WATCHER_ALERT_LIFECYCLE.STALE || status === WATCHER_ALERT_LIFECYCLE.EXPIRED;
  }

  return status === normalized;
}

export function partitionWatcherAlertsByLifecycle(alerts = [], options = {}) {
  const nowMs = options.nowMs || Date.now();
  const hydrated = alerts.map((alert) => alert?.lifecycle ? alert : attachWatcherAlertLifecycle(alert, { nowMs }));

  const active = [];
  const stale = [];
  const expired = [];

  for (const alert of hydrated) {
    if (alert.lifecycle.status === WATCHER_ALERT_LIFECYCLE.EXPIRED) {
      expired.push(alert);
    } else if (alert.lifecycle.status === WATCHER_ALERT_LIFECYCLE.STALE) {
      stale.push(alert);
    } else {
      active.push(alert);
    }
  }

  return {
    alerts: hydrated,
    active,
    stale,
    expired,
    summary: summarizeWatcherAlertLifecycle(hydrated, { nowMs })
  };
}

export function filterWatcherAlertsByLifecycle(alerts = [], lifecycle = 'all', options = {}) {
  const { alerts: hydrated } = partitionWatcherAlertsByLifecycle(alerts, options);
  return hydrated.filter((alert) => matchesWatcherAlertLifecycle(alert, lifecycle));
}

export function getWatcherIssueFamily(issueType = '') {
  return String(issueType || '')
    .replace(/_(high|medium|low|info)$/i, '')
    .trim();
}

export function getWatcherIssueIdentity(alert = {}) {
  const atomId = alert?.context?.atomId || '';
  return [
    String(alert?.filePath || ''),
    getWatcherIssueFamily(alert?.issueType || ''),
    String(atomId)
  ].join('::');
}

export function findSupersededWatcherAlertIds(alerts = []) {
  const latestByIdentity = new Map();
  const supersededIds = [];

  for (const alert of alerts) {
    const id = alert?.id;
    if (!Number.isInteger(id)) continue;

    const identity = getWatcherIssueIdentity(alert);
    const detectedAtMs = Date.parse(alert?.detectedAt || '') || 0;
    const current = latestByIdentity.get(identity);

    if (!current || detectedAtMs > current.detectedAtMs || (detectedAtMs === current.detectedAtMs && id > current.id)) {
      if (current?.id) supersededIds.push(current.id);
      latestByIdentity.set(identity, { id, detectedAtMs });
      continue;
    }

    supersededIds.push(id);
  }

  return [...new Set(supersededIds)];
}
