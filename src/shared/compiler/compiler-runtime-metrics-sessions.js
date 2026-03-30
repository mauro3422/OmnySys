/**
 * @fileoverview MCP session/runtime summary helpers.
 *
 * @module shared/compiler/compiler-runtime-metrics-sessions
 */

import {
  buildMcpSessionSummaryText,
  buildToleratedDuplicateClientSet,
  normalizeClientId
} from './compiler-runtime-metrics-sessions-format.js';

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

function collectSessionDbSnapshot(sessionDb) {
  const db = normalizeSessionDb(sessionDb);
  if (!db) return null;

  try {
    const totalPersistent = asNumber(db.prepare('SELECT COUNT(*) AS count FROM mcp_sessions').get()?.count);
    const totalPersistentActive = asNumber(db.prepare('SELECT COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1').get()?.count);
    const uniqueClients = asNumber(db.prepare('SELECT COUNT(DISTINCT client_id) AS count FROM mcp_sessions WHERE is_active = 1').get()?.count);
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
      duplicateDetails
    };
  } catch {
    return null;
  }
}

function buildClientSyncDiagnostics({
  runtimeSessionCount = 0,
  totalPersistentActive = 0,
  uniqueClients = 0,
  clientsWithDuplicates = 0,
  actionableDuplicateClients = 0,
  toleratedDuplicateClients = 0,
  sessionCountDrift = false,
  multiClientChurn = false,
  persistenceState = null,
  recentErrors = null
} = {}) {
  const persistenceAvailable = persistenceState?.available === true;
  const signals = flattenRecentErrorSignals(recentErrors);
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

  if (!persistenceAvailable && runtimeSessionCount > 0) {
    return {
      state: 'blocked',
      severity: 'high',
      healthy: false,
      trustworthy: false,
      reason: persistenceState?.reason || 'Session persistence is unavailable while MCP sessions are active.',
      recommendation: 'Reload the client bridge, verify the MCP tool catalog, and restore session persistence before trusting the UI.',
      evidence: {
        persistenceState,
        runtimeSessionCount,
        totalPersistentActive,
        uniqueClients,
        clientsWithDuplicates,
        actionableDuplicateClients,
        toleratedDuplicateClients,
        sessionCountDrift,
        multiClientChurn,
        detectedSignals
      }
    };
  }

  if (sessionCountDrift) {
    return {
      state: 'blocked',
      severity: 'high',
      healthy: false,
      trustworthy: false,
      reason: `Runtime sessions (${runtimeSessionCount}) exceed persistent active rows (${totalPersistentActive}).`,
      recommendation: 'Restart the bridge/client session and clear stale session state before trusting the tool catalog.',
      evidence: {
        persistenceState,
        runtimeSessionCount,
        totalPersistentActive,
        uniqueClients,
        clientsWithDuplicates,
        actionableDuplicateClients,
        toleratedDuplicateClients,
        sessionCountDrift,
        multiClientChurn,
        detectedSignals
      }
    };
  }

  if (actionableDuplicateClients > 0) {
    return {
      state: actionableDuplicateClients > 1 || detectedSignals.length > 0 ? 'blocked' : 'stale',
      severity: actionableDuplicateClients > 1 ? 'high' : 'medium',
      healthy: false,
      trustworthy: false,
      reason: `${actionableDuplicateClients} client bucket(s) still have duplicated active sessions.`,
      recommendation: 'Deduplicate the client session buckets and refresh the client catalog before continuing.',
      evidence: {
        persistenceState,
        runtimeSessionCount,
        totalPersistentActive,
        uniqueClients,
        clientsWithDuplicates,
        actionableDuplicateClients,
        toleratedDuplicateClients,
        sessionCountDrift,
        multiClientChurn,
        detectedSignals
      }
    };
  }

  if (detectedSignals.length > 0) {
    return {
      state: 'stale',
      severity: 'medium',
      healthy: true,
      trustworthy: false,
      reason: `Recent reconnect/session signals were observed (${detectedSignals.join(', ')}).`,
      recommendation: 'Refresh the client UI and verify the MCP catalog after the transport settles.',
      evidence: {
        persistenceState,
        runtimeSessionCount,
        totalPersistentActive,
        uniqueClients,
        clientsWithDuplicates,
        actionableDuplicateClients,
        toleratedDuplicateClients,
        sessionCountDrift,
        multiClientChurn,
        detectedSignals
      }
    };
  }

  if (multiClientChurn || toleratedDuplicateClients > 0 || uniqueClients > 1) {
    return {
      state: 'watchful',
      severity: 'low',
      healthy: true,
      trustworthy: true,
      reason: toleratedDuplicateClients > 0
        ? `${toleratedDuplicateClients} duplicate client bucket(s) are tolerated for known bridges.`
        : multiClientChurn
          ? 'Client session churn is visible but still within tolerated bounds.'
          : 'Multiple clients are connected without duplicate-session drift.',
      recommendation: 'Keep an eye on client session churn and refresh the UI if tools disappear again.',
      evidence: {
        persistenceState,
        runtimeSessionCount,
        totalPersistentActive,
        uniqueClients,
        clientsWithDuplicates,
        actionableDuplicateClients,
        toleratedDuplicateClients,
        sessionCountDrift,
        multiClientChurn,
        detectedSignals
      }
    };
  }

  return {
    state: 'fresh',
    severity: 'low',
    healthy: true,
    trustworthy: true,
    reason: 'MCP client sessions are aligned and stable.',
    recommendation: 'Keep the client session canonical and refresh only if the catalog stops updating.',
    evidence: {
      persistenceState,
      runtimeSessionCount,
      totalPersistentActive,
      uniqueClients,
      clientsWithDuplicates,
      actionableDuplicateClients,
      toleratedDuplicateClients,
      sessionCountDrift,
      multiClientChurn,
      detectedSignals
    }
  };
}

export function collectMcpSessionMetrics(sessionManager, options = {}) {
  const hasRuntimeSessionCount = Number.isFinite(options.runtimeSessionCount);
  const runtimeSessionCount = hasRuntimeSessionCount ? options.runtimeSessionCount : null;
  const toleratedDuplicateClientIds = buildToleratedDuplicateClientSet(options.toleratedDuplicateClientIds);
  const recentErrors = options.recentErrors || null;
  const sessionDbSnapshot = collectSessionDbSnapshot(options.sessionDb);
  const persistenceState = sessionDbSnapshot ? {
    available: true,
    mode: 'sqlite',
    source: 'sqlite',
    reason: null
  } : (sessionManager?.getSessionPersistenceState?.() || {
    available: false,
    mode: 'memory-fallback',
    source: 'memory',
    reason: 'session manager state unavailable'
  });
  const empty = {
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
    clientSyncState: runtimeSessionCount > 0 && !persistenceState.available ? 'blocked' : 'missing',
    clientSyncSeverity: runtimeSessionCount > 0 && !persistenceState.available ? 'high' : 'low',
    clientSyncHealthy: runtimeSessionCount <= 0 || persistenceState.available,
    clientSyncTrustworthy: runtimeSessionCount <= 0 || persistenceState.available,
    clientSyncReason: runtimeSessionCount > 0 && !persistenceState.available
      ? persistenceState.reason || 'Session persistence is unavailable while MCP sessions are active.'
      : 'Session summary unavailable.',
    clientSyncRecommendation: runtimeSessionCount > 0 && !persistenceState.available
      ? 'Restore session persistence before trusting the client catalog.'
      : 'No client session drift data is available yet.',
    clientSyncEvidence: {
      persistenceState,
      runtimeSessionCount
    },
    clientSyncSummary: runtimeSessionCount > 0 && !persistenceState.available
      ? 'client sync blocked: session persistence unavailable'
      : null,
    summary: runtimeSessionCount > 0
      ? `${runtimeSessionCount} runtime session(s), ${persistenceState.available ? 'session persistence available' : 'session persistence unavailable (memory fallback)'}${runtimeSessionCount > 0 && !persistenceState.available ? ' | client sync=blocked' : ''}`
      : 'No active MCP sessions'
  };

  if (!sessionManager?.getDedupStats || !sessionManager?.getAllSessions) {
    if (!sessionDbSnapshot) {
      return empty;
    }
  }

  const dedupStats = sessionDbSnapshot ? {
    uniqueClients: sessionDbSnapshot.uniqueClients,
    clientsWithDuplicates: sessionDbSnapshot.clientsWithDuplicates,
    duplicateDetails: sessionDbSnapshot.duplicateDetails
  } : sessionManager.getDedupStats();
  if ((!dedupStats || dedupStats.error) && !sessionDbSnapshot) {
    return {
      ...empty,
      error: dedupStats?.error || 'session summary unavailable'
    };
  }

  const totalPersistent = sessionDbSnapshot?.totalPersistent ?? sessionManager.getAllSessions(false).length;
  const totalPersistentActive = sessionDbSnapshot?.totalPersistentActive ?? sessionManager.getAllSessions(true).length;
  const uniqueClients = sessionDbSnapshot?.uniqueClients ?? (dedupStats?.uniqueClients || 0);
  const clientsWithDuplicates = sessionDbSnapshot?.clientsWithDuplicates ?? (dedupStats?.clientsWithDuplicates || 0);
  const duplicateDetails = sessionDbSnapshot?.duplicateDetails ?? (dedupStats?.duplicateDetails || []);
  const toleratedDuplicateDetails = duplicateDetails.filter((detail) => (
    toleratedDuplicateClientIds.has(normalizeClientId(detail.clientId))
  ));
  const actionableDuplicateDetails = duplicateDetails.filter((detail) => (
    !toleratedDuplicateClientIds.has(normalizeClientId(detail.clientId))
  ));
  const toleratedDuplicateClients = toleratedDuplicateDetails.length;
  const actionableDuplicateClients = actionableDuplicateDetails.length;
  const multiClientActive = uniqueClients > 1;
  const sessionCountDrift = hasRuntimeSessionCount
    ? totalPersistentActive === 0 && runtimeSessionCount > 0
    : false;
  const multiClientChurn = actionableDuplicateClients > 0 || sessionCountDrift;
  const clientSync = buildClientSyncDiagnostics({
    runtimeSessionCount: runtimeSessionCount || 0,
    totalPersistentActive,
    uniqueClients,
    clientsWithDuplicates,
    actionableDuplicateClients,
    toleratedDuplicateClients,
    sessionCountDrift,
    multiClientChurn,
    persistenceState,
    recentErrors
  });
  const sessionSummary = buildMcpSessionSummaryText({
    hasRuntimeSessionCount,
    runtimeSessionCount,
    totalPersistentActive,
    uniqueClients,
    clientsWithDuplicates,
    toleratedDuplicateClients
  });

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
    clientSyncState: clientSync.state,
    clientSyncSeverity: clientSync.severity,
    clientSyncHealthy: clientSync.healthy,
    clientSyncTrustworthy: clientSync.trustworthy,
    clientSyncReason: clientSync.reason,
    clientSyncRecommendation: clientSync.recommendation,
    clientSyncEvidence: clientSync.evidence,
    clientSyncSummary: clientSync.state === 'fresh'
      ? null
      : `client sync ${clientSync.state}: ${clientSync.reason}`,
    summary: clientSync.state === 'fresh'
      ? sessionSummary
      : `${sessionSummary} | client sync=${clientSync.state}`
  };
}
