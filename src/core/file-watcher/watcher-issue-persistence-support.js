/**
 * @fileoverview Local support helpers for watcher issue persistence.
 *
 * Keeps serialization/result helpers out of the coordinator module so
 * watcher-issue-persistence stays focused on orchestration.
 *
 * @module core/file-watcher/watcher-issue-persistence-support
 */

export function normalizeWatcherMessage(message = '') {
  return String(message || '').trim().replace(/^\[watcher\]\s*/i, '').trim();
}

export function stableJson(value) {
  if (value == null) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

export function safeJsonParse(value, fallback = {}) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return fallback;
  }
}

export function createWatcherIssueReconciliationSummary(overrides = {}) {
  return {
    deletedExpired: 0,
    deletedSuperseded: 0,
    deletedOutdated: 0,
    deletedOrphaned: 0,
    deletedLowSignal: 0,
    summary: { total: 0, byStatus: {} },
    ...overrides
  };
}

export function createEmptyWatcherIssueLoadResult(reconciliation = null) {
  return {
    total: 0,
    alerts: [],
    reconciliation: reconciliation || createWatcherIssueReconciliationSummary()
  };
}
