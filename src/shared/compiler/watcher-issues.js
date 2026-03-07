/**
 * @fileoverview Canonical watcher diagnostics contract.
 *
 * Centralizes how FileWatcher issues are serialized into SQLite and how MCP
 * consumers read them back. This keeps watcher/runtime alerts, MCP tools and
 * future compiler guards on the same payload shape.
 *
 * @module shared/compiler/watcher-issues
 */

import { WATCHER_ALERT_LIFECYCLE } from './watcher-issue-lifecycle.js';

export const WATCHER_MESSAGE_PREFIX = '[watcher]';
export const WATCHER_ALERT_SOURCE = 'file_watcher';
export const WATCHER_CONTRACT_VERSION = 1;

function normalizeSeverity(severity = 'medium') {
  const normalized = String(severity || 'medium').toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low' || normalized === 'info') {
    return normalized;
  }
  return 'medium';
}

function severityToLevel(severity = 'medium') {
  if (severity === 'high') return 'error';
  if (severity === 'info') return 'info';
  return 'warn';
}

export function isWatcherIssueMessage(message = '') {
  return String(message || '').startsWith(WATCHER_MESSAGE_PREFIX);
}

export function stripWatcherMessagePrefix(message = '') {
  return isWatcherIssueMessage(message)
    ? String(message).slice(WATCHER_MESSAGE_PREFIX.length).trimStart()
    : String(message || '');
}

export function normalizeWatcherIssueContext(context = {}) {
  const normalized = (context && typeof context === 'object' && !Array.isArray(context)) ? context : {};

  return {
    source: WATCHER_ALERT_SOURCE,
    contractVersion: WATCHER_CONTRACT_VERSION,
    lifecycle: {
      status: WATCHER_ALERT_LIFECYCLE.ACTIVE,
      stale: false
    },
    ...normalized
  };
}

export function serializeWatcherIssueContext(context = {}) {
  return JSON.stringify(normalizeWatcherIssueContext(context));
}

export function parseWatcherIssueContext(contextJson = '{}') {
  try {
    return normalizeWatcherIssueContext(JSON.parse(contextJson || '{}'));
  } catch {
    return normalizeWatcherIssueContext();
  }
}

export function createWatcherIssueRecord({
  filePath,
  issueType,
  severity = 'medium',
  message,
  lineNumber = null,
  context = {},
  detectedAt = new Date().toISOString()
} = {}) {
  const normalizedSeverity = normalizeSeverity(severity);
  const rawMessage = stripWatcherMessagePrefix(message);
  const normalizedContext = normalizeWatcherIssueContext(context);

  return {
    source: 'watcher',
    level: severityToLevel(normalizedSeverity),
    severity: normalizedSeverity,
    issueType,
    filePath,
    message: `${WATCHER_MESSAGE_PREFIX} ${rawMessage}`.trim(),
    lineNumber,
    detectedAt,
    context: normalizedContext,
    contextJson: JSON.stringify(normalizedContext)
  };
}

export function mapSemanticIssueRowToWatcherAlert(row = {}) {
  const severity = normalizeSeverity(row.severity);
  return {
    id: row.id ?? null,
    source: 'watcher',
    level: severityToLevel(severity),
    severity,
    issueType: row.issue_type,
    filePath: row.file_path,
    message: row.message,
    lineNumber: row.line_number ?? null,
    detectedAt: row.detected_at,
    context: parseWatcherIssueContext(row.context_json)
  };
}

export function summarizeWatcherAlerts(alerts = []) {
  return alerts.reduce((summary, alert) => {
    const severity = alert?.severity || 'unknown';
    const issueType = alert?.issueType || 'unknown';
    summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;
    summary.byType[issueType] = (summary.byType[issueType] || 0) + 1;
    return summary;
  }, {
    totalAlerts: Array.isArray(alerts) ? alerts.length : 0,
    bySeverity: {},
    byType: {}
  });
}
