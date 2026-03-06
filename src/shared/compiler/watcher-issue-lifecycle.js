/**
 * @fileoverview Canonical lifecycle helpers for watcher diagnostics.
 *
 * Distinguishes between active/stale watcher alerts so MCP tools and future
 * compiler policies stop treating historical noise as live debt.
 *
 * @module shared/compiler/watcher-issue-lifecycle
 */

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export const WATCHER_ALERT_LIFECYCLE = {
  ACTIVE: 'active',
  STALE: 'stale',
  EXPIRED: 'expired'
};

export const WATCHER_ALERT_TTL_MS = {
  watcher_runtime_error: 5 * MINUTE_MS,
  defaultHigh: 12 * HOUR_MS,
  defaultMedium: 24 * HOUR_MS,
  defaultLow: 48 * HOUR_MS
};

function toTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getWatcherAlertTtlMs(alert = {}) {
  if (alert?.issueType && WATCHER_ALERT_TTL_MS[alert.issueType]) {
    return WATCHER_ALERT_TTL_MS[alert.issueType];
  }

  switch (alert?.severity) {
    case 'high':
      return WATCHER_ALERT_TTL_MS.defaultHigh;
    case 'low':
      return WATCHER_ALERT_TTL_MS.defaultLow;
    case 'medium':
    default:
      return WATCHER_ALERT_TTL_MS.defaultMedium;
  }
}

export function classifyWatcherAlertLifecycle(alert = {}, options = {}) {
  const nowMs = options.nowMs || Date.now();
  const detectedAtMs = toTimestamp(alert.detectedAt);
  if (!detectedAtMs) {
    return {
      status: WATCHER_ALERT_LIFECYCLE.ACTIVE,
      ageMs: null,
      ttlMs: getWatcherAlertTtlMs(alert),
      stale: false
    };
  }

  const ageMs = Math.max(0, nowMs - detectedAtMs);
  const ttlMs = options.ttlMs || getWatcherAlertTtlMs(alert);
  const expiredMs = ttlMs * 2;

  let status = WATCHER_ALERT_LIFECYCLE.ACTIVE;
  if (ageMs >= expiredMs) {
    status = WATCHER_ALERT_LIFECYCLE.EXPIRED;
  } else if (ageMs >= ttlMs) {
    status = WATCHER_ALERT_LIFECYCLE.STALE;
  }

  return {
    status,
    ageMs,
    ttlMs,
    stale: status !== WATCHER_ALERT_LIFECYCLE.ACTIVE
  };
}

export function attachWatcherAlertLifecycle(alert = {}, options = {}) {
  return {
    ...alert,
    lifecycle: classifyWatcherAlertLifecycle(alert, options)
  };
}

export function summarizeWatcherAlertLifecycle(alerts = [], options = {}) {
  const nowMs = options.nowMs || Date.now();
  return alerts.reduce((summary, alert) => {
    const lifecycle = alert.lifecycle || classifyWatcherAlertLifecycle(alert, { nowMs });
    summary.total += 1;
    summary.byStatus[lifecycle.status] = (summary.byStatus[lifecycle.status] || 0) + 1;
    return summary;
  }, {
    total: 0,
    byStatus: {
      [WATCHER_ALERT_LIFECYCLE.ACTIVE]: 0,
      [WATCHER_ALERT_LIFECYCLE.STALE]: 0,
      [WATCHER_ALERT_LIFECYCLE.EXPIRED]: 0
    }
  });
}
