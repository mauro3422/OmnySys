/**
 * @fileoverview Session persistence snapshot and client sync drift helpers for MCP runtime metrics.
 *
 * @module shared/compiler/compiler-runtime-metrics-sessions-state
 */

import { buildMcpSessionSummaryText } from './compiler-runtime-metrics-sessions-format.js';

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function flattenRecentErrorSignals(recentErrors = null) {
  const logs = Array.isArray(recentErrors?.logs) ? recentErrors.logs : [];
  return logs
    .map((entry) => String(entry?.message || ''))
    .join(' ')
    .toLowerCase();
}

function normalizeSessionDb(sessionDb) {
  return sessionDb && typeof sessionDb.prepare === 'function' ? sessionDb : null;
}

export function resolveSessionSyncGraceMs() {
  const raw = Number(process.env.OMNYSYS_SESSION_SYNC_GRACE_MS);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }

  return 120000;
}

function getAgeMs(updatedAt, now = Date.now()) {
  if (!updatedAt) return null;

  const parsed = typeof updatedAt === 'number' ? updatedAt : new Date(updatedAt).getTime();
  return Number.isFinite(parsed) ? Math.max(0, now - parsed) : null;
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

export function collectSessionDbSnapshot(sessionDb) {
  const db = normalizeSessionDb(sessionDb);
  if (!db) return null;

  try {
    const freshnessWindowMs = resolveSessionSyncGraceMs();
    const freshnessCutoff = new Date(Date.now() - freshnessWindowMs).toISOString();
    const totalPersistent = asNumber(db.prepare('SELECT COUNT(*) AS count FROM mcp_sessions').get()?.count);
    const totalPersistentActive = asNumber(db.prepare('SELECT COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1').get()?.count);
    const uniqueClients = asNumber(db.prepare('SELECT COUNT(DISTINCT client_id) AS count FROM mcp_sessions WHERE is_active = 1').get()?.count);
    const recentSessionCount = asNumber(db.prepare('SELECT COUNT(*) AS count FROM mcp_sessions WHERE updated_at >= ?').get(freshnessCutoff)?.count);
    const recentActiveCount = asNumber(db.prepare('SELECT COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1 AND updated_at >= ?').get(freshnessCutoff)?.count);
    const latestSessionRow = db.prepare(`
      SELECT updated_at
      FROM mcp_sessions
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
    const latestActiveSessionRow = db.prepare(`
      SELECT updated_at
      FROM mcp_sessions
      WHERE is_active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
    const duplicateDetails = db.prepare(`
      SELECT client_id, COUNT(*) AS count
      FROM mcp_sessions
      WHERE is_active = 1
      GROUP BY client_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC, client_id ASC
    `).all().map((row) => ({
      clientId: row.client_id,
      count: asNumber(row.count)
    }));

    return {
      available: true,
      totalPersistent,
      totalPersistentActive,
      uniqueClients,
      clientsWithDuplicates: duplicateDetails.length,
      duplicateDetails,
      freshnessWindowMs,
      recentSessionCount,
      recentActiveCount,
      latestUpdatedAt: latestSessionRow?.updated_at || null,
      latestUpdatedAtAgeMs: getAgeMs(latestSessionRow?.updated_at),
      latestActiveUpdatedAt: latestActiveSessionRow?.updated_at || null,
      latestActiveUpdatedAtAgeMs: getAgeMs(latestActiveSessionRow?.updated_at)
    };
  } catch {
    return null;
  }
}

function buildClientSyncEvidence(context) {
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

function buildClientSyncResult(context, result) {
  return {
    ...result,
    evidence: buildClientSyncEvidence(context)
  };
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

export function buildMcpSessionMetricsResult({
  hasRuntimeSessionCount = false,
  runtimeSessionCount = null,
  totalPersistent = 0,
  totalPersistentActive = 0,
  uniqueClients = 0,
  clientsWithDuplicates = 0,
  duplicateDetails = [],
  actionableDuplicateClients = 0,
  actionableDuplicateDetails = [],
  toleratedDuplicateClients = 0,
  toleratedDuplicateDetails = [],
  multiClientActive = false,
  sessionCountDrift = false,
  multiClientChurn = false,
  persistenceState = null,
  clientSync = null
} = {}) {
  const sessionSummary = buildMcpSessionSummaryText({
    hasRuntimeSessionCount,
    runtimeSessionCount,
    totalPersistentActive,
    uniqueClients,
    clientsWithDuplicates,
    toleratedDuplicateClients
  });
  const annotatedSummary = clientSync?.state === 'fresh'
    ? sessionSummary
    : `${sessionSummary} | client sync=${clientSync?.state || 'missing'}`;

  return {
    runtimeSessions: runtimeSessionCount,
    totalPersistent,
    totalPersistentActive,
    uniqueClients,
    clientsWithDuplicates,
    duplicateDetails,
    actionableDuplicateClients,
    actionableDuplicateDetails,
    toleratedDuplicateClients,
    toleratedDuplicateDetails,
    multiClientActive,
    sessionCountDrift,
    multiClientChurn,
    persistenceState,
    clientSyncState: clientSync?.state || 'missing',
    clientSyncSeverity: clientSync?.severity || 'low',
    clientSyncHealthy: clientSync?.healthy !== false,
    clientSyncTrustworthy: clientSync?.trustworthy !== false,
    clientSyncReason: clientSync?.reason || 'Session summary unavailable.',
    clientSyncRecommendation: clientSync?.recommendation || 'No client session drift data is available yet.',
    clientSyncEvidence: clientSync?.evidence || {
      persistenceState,
      runtimeSessionCount
    },
    clientSyncSummary: clientSync?.state === 'fresh'
      ? null
      : `client sync ${clientSync?.state || 'missing'}: ${clientSync?.reason || 'Session summary unavailable.'}`,
    summary: annotatedSummary
  };
}

export function resolveMcpSessionMetricsBaseline({
  sessionManager,
  sessionDbSnapshot = null,
  persistenceState = null,
  empty = null
} = {}) {
  const supportsRuntimeLookups = Boolean(sessionManager?.getDedupStats && sessionManager?.getAllSessions);
  if (!supportsRuntimeLookups && !sessionDbSnapshot) {
    return { earlyReturn: empty };
  }

  const dedupStats = sessionDbSnapshot ? {
    uniqueClients: sessionDbSnapshot.uniqueClients,
    clientsWithDuplicates: sessionDbSnapshot.clientsWithDuplicates,
    duplicateDetails: sessionDbSnapshot.duplicateDetails
  } : sessionManager.getDedupStats();

  if ((!dedupStats || dedupStats.error) && !sessionDbSnapshot) {
    return {
      earlyReturn: {
        ...empty,
        error: dedupStats?.error || 'session summary unavailable'
      }
    };
  }

  const sessionPairs = sessionDbSnapshot ? null : {
    all: sessionManager.getAllSessions(false),
    active: sessionManager.getAllSessions(true)
  };

  return {
    dedupStats,
    totalPersistent: sessionDbSnapshot?.totalPersistent ?? sessionPairs.all.length,
    totalPersistentActive: sessionDbSnapshot?.totalPersistentActive ?? sessionPairs.active.length,
    uniqueClients: sessionDbSnapshot?.uniqueClients ?? (dedupStats?.uniqueClients || 0),
    clientsWithDuplicates: sessionDbSnapshot?.clientsWithDuplicates ?? (dedupStats?.clientsWithDuplicates || 0),
    duplicateDetails: sessionDbSnapshot?.duplicateDetails ?? (dedupStats?.duplicateDetails || []),
    persistenceState
  };
}

export function buildEmptyMcpSessionMetrics({
  runtimeSessionCount = null,
  persistenceState = null
} = {}) {
  const persistenceAvailable = persistenceState?.available === true;
  const blocked = runtimeSessionCount > 0 && !persistenceAvailable;

  return {
    runtimeSessions: runtimeSessionCount,
    totalPersistent: 0,
    totalPersistentActive: 0,
    uniqueClients: 0,
    clientsWithDuplicates: 0,
    duplicateDetails: [],
    actionableDuplicateClients: 0,
    actionableDuplicateDetails: [],
    toleratedDuplicateClients: 0,
    toleratedDuplicateDetails: [],
    multiClientActive: false,
    sessionCountDrift: false,
    multiClientChurn: false,
    persistenceState,
    clientSyncState: blocked ? 'blocked' : 'missing',
    clientSyncSeverity: blocked ? 'high' : 'low',
    clientSyncHealthy: runtimeSessionCount <= 0 || persistenceAvailable,
    clientSyncTrustworthy: runtimeSessionCount <= 0 || persistenceAvailable,
    clientSyncReason: blocked
      ? persistenceState?.reason || 'Session persistence is unavailable while MCP sessions are active.'
      : 'Session summary unavailable.',
    clientSyncRecommendation: blocked
      ? 'Restore session persistence before trusting the client catalog.'
      : 'No client session drift data is available yet.',
    clientSyncEvidence: {
      persistenceState,
      runtimeSessionCount
    },
    clientSyncSummary: blocked
      ? 'client sync blocked: session persistence unavailable'
      : null,
    summary: runtimeSessionCount > 0
      ? `${runtimeSessionCount} runtime session(s), ${persistenceAvailable ? 'session persistence available' : 'session persistence unavailable (memory fallback)'}${blocked ? ' | client sync=blocked' : ''}`
      : 'No active MCP sessions'
  };
}
