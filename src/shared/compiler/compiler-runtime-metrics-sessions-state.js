/**
 * @fileoverview Session persistence snapshot and client sync drift helpers for MCP runtime metrics.
 *
 * @module shared/compiler/compiler-runtime-metrics-sessions-state
 */

import { buildMcpSessionSummaryText } from './compiler-runtime-metrics-sessions-format.js';
export { buildClientSyncDiagnostics, resolveSessionSyncGraceMs } from './compiler-runtime-metrics-sessions-client-sync.js';
export { collectSessionDbSnapshot } from '#layer-c/query/apis/mcp-sessions-api.js';
import { asNumber } from './core-utils.js';

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
