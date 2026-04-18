/**
 * @fileoverview Client sync evidence/result helpers for MCP runtime metrics.
 *
 * @module shared/compiler/compiler-runtime-metrics-sessions-client-sync
 */

import { asNumber } from './core-utils.js';

export function buildClientSyncEvidence(context) {
  return {
    persistenceState: context.persistenceState,
    runtimeSessionCount: context.runtimeSessionCount,
    totalPersistentActive: context.totalPersistentActive,
    uniqueClients: context.uniqueClients,
    clientsWithDuplicates: context.clientsWithDuplicates,
    actionableDuplicateClients: context.actionableDuplicateClients,
    toleratedDuplicateClients: context.toleratedDuplicateClients,
    sessionCountDrift: context.sessionCountDrift,
    multiClientChurn: context.multiClientChurn,
    detectedSignals: context.detectedSignals,
    sessionSnapshot: context.sessionSnapshot
  };
}

export function buildClientSyncResult(context, result) {
  return {
    ...result,
    evidence: buildClientSyncEvidence(context)
  };
}

function flattenRecentErrorSignals(recentErrors = null) {
  const logs = Array.isArray(recentErrors?.logs) ? recentErrors.logs : [];
  return logs
    .map((entry) => String(entry?.message || ''))
    .join(' ')
    .toLowerCase();
}

export function resolveSessionSyncGraceMs() {
  const raw = Number(process.env.OMNYSYS_SESSION_SYNC_GRACE_MS);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }

  return 120000;
}

function isRecentSessionActivityObserved(sessionSnapshot, sessionSyncGraceMs = resolveSessionSyncGraceMs()) {
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

function buildClientSyncContext(options = {}) {
  const sessionSnapshot = options.sessionSnapshot || null;
  const sessionSyncGraceMs = Number.isFinite(options.sessionSyncGraceMs) && options.sessionSyncGraceMs > 0
    ? options.sessionSyncGraceMs
    : resolveSessionSyncGraceMs();
  const signals = flattenRecentErrorSignals(options.recentErrors);
  const detectedSignals = [
    'reconnecting',
    'transport closed',
    'session expired',
    'invalid session',
    'session not found',
    'thread-stream-state-changed',
    'bridge reconnected',
    'bridge recovery'
  ].filter((needle) => signals.includes(needle));

  return {
    persistenceState: options.persistenceState || null,
    runtimeSessionCount: options.runtimeSessionCount || 0,
    totalPersistentActive: options.totalPersistentActive || 0,
    uniqueClients: options.uniqueClients || 0,
    clientsWithDuplicates: options.clientsWithDuplicates || 0,
    actionableDuplicateClients: options.actionableDuplicateClients || 0,
    toleratedDuplicateClients: options.toleratedDuplicateClients || 0,
    sessionCountDrift: options.sessionCountDrift === true,
    multiClientChurn: options.multiClientChurn === true,
    sessionSnapshot,
    sessionSyncGraceMs,
    detectedSignals,
    persistenceAvailable: options.persistenceState?.available === true,
    hasSessionHistory: asNumber(sessionSnapshot?.totalPersistent, 0) > 0,
    recentActivityObserved: isRecentSessionActivityObserved(sessionSnapshot, sessionSyncGraceMs)
  };
}

function buildBlockedPersistenceClientSync(context) {
  return buildClientSyncResult(context, {
    state: 'blocked',
    severity: 'high',
    healthy: false,
    trustworthy: false,
    reason: context.persistenceState?.reason || 'Session persistence is unavailable while MCP sessions are active.',
    recommendation: 'Reload the client bridge, verify the MCP tool catalog, and restore session persistence before trusting the UI.'
  });
}

function buildBlockedDriftClientSync(context) {
  return buildClientSyncResult(context, {
    state: 'blocked',
    severity: 'high',
    healthy: false,
    trustworthy: false,
    reason: `Runtime sessions (${context.runtimeSessionCount}) exceed persistent active rows (${context.totalPersistentActive}).`,
    recommendation: 'Restart the bridge/client session and clear stale session state before trusting the tool catalog.'
  });
}

function buildReconcilingClientSync(context, reason) {
  return buildClientSyncResult(context, {
    state: 'reconciling',
    severity: 'low',
    healthy: true,
    trustworthy: false,
    reason,
    recommendation: 'Wait for the IDE bridge to reconnect or refresh the client MCP catalog.'
  });
}

function buildStaleClientSync(context, reason, recommendation) {
  return buildClientSyncResult(context, {
    state: 'stale',
    severity: 'medium',
    healthy: false,
    trustworthy: false,
    reason,
    recommendation
  });
}

function buildDuplicateClientSync(context) {
  return buildClientSyncResult(context, {
    state: context.actionableDuplicateClients > 1 || context.detectedSignals.length > 0 ? 'blocked' : 'stale',
    severity: context.actionableDuplicateClients > 1 ? 'high' : 'medium',
    healthy: false,
    trustworthy: false,
    reason: `${context.actionableDuplicateClients} client bucket(s) still have duplicated active sessions.`,
    recommendation: 'Deduplicate the client session buckets and refresh the client catalog before continuing.'
  });
}

function buildSignalClientSync(context) {
  return buildClientSyncResult(context, {
    state: 'stale',
    severity: 'medium',
    healthy: true,
    trustworthy: false,
    reason: `Recent reconnect/session signals were observed (${context.detectedSignals.join(', ')}).`,
    recommendation: 'Refresh the client UI and verify the MCP catalog after the transport settles.'
  });
}

function buildWatchfulClientSync(context) {
  return buildClientSyncResult(context, {
    state: 'watchful',
    severity: 'low',
    healthy: true,
    trustworthy: true,
    reason: context.toleratedDuplicateClients > 0
      ? `${context.toleratedDuplicateClients} duplicate client bucket(s) are tolerated for known bridges.`
      : context.multiClientChurn
        ? 'Client session churn is visible but still within tolerated bounds.'
        : 'Multiple clients are connected without duplicate-session drift.',
    recommendation: 'Keep an eye on client session churn and refresh the UI if tools disappear again.'
  });
}

function buildFreshClientSync(context) {
  return buildClientSyncResult(context, {
    state: 'fresh',
    severity: 'low',
    healthy: true,
    trustworthy: true,
    reason: 'MCP client sessions are aligned and stable.',
    recommendation: 'Keep the client session canonical and refresh only if the catalog stops updating.'
  });
}

const CLIENT_SYNC_RULES = [
  {
    when: (context) => !context.persistenceAvailable && context.runtimeSessionCount > 0,
    build: buildBlockedPersistenceClientSync
  },
  {
    when: (context) => context.runtimeSessionCount > 0 && context.totalPersistentActive === 0 && context.persistenceAvailable,
    build: (context) => buildReconcilingClientSync(
      context,
      'Runtime sessions are live while persistent active rows are still zero; waiting for bridge synchronization.'
    )
  },
  {
    when: (context) => context.sessionCountDrift,
    build: buildBlockedDriftClientSync
  },
  {
    when: (context) => context.runtimeSessionCount === 0 && context.totalPersistentActive === 0 && context.hasSessionHistory && context.recentActivityObserved,
    build: (context) => buildReconcilingClientSync(context, 'MCP session history is still reconciling after recent activity.')
  },
  {
    when: (context) => context.runtimeSessionCount === 0 && context.totalPersistentActive === 0 && context.hasSessionHistory,
    build: (context) => buildStaleClientSync(
      context,
      'Persistent MCP session history exists, but no live client bridge is currently attached.',
      'Reload the IDE MCP client or re-open the workspace so the stdio bridge reconnects.'
    )
  },
  {
    when: (context) => context.runtimeSessionCount > 0 && context.totalPersistentActive === 0 && context.hasSessionHistory && context.recentActivityObserved,
    build: (context) => buildReconcilingClientSync(context, 'A live runtime session is visible while persistence is still reconciling recent client activity.')
  },
  {
    when: (context) => context.actionableDuplicateClients > 0,
    build: buildDuplicateClientSync
  },
  {
    when: (context) => context.detectedSignals.length > 0,
    build: buildSignalClientSync
  },
  {
    when: (context) => context.multiClientChurn || context.toleratedDuplicateClients > 0 || context.uniqueClients > 1,
    build: buildWatchfulClientSync
  }
];

export function buildClientSyncDiagnostics(options = {}) {
  const context = buildClientSyncContext(options);
  const matchedRule = CLIENT_SYNC_RULES.find((rule) => rule.when(context));
  return matchedRule ? matchedRule.build(context) : buildFreshClientSync(context);
}
