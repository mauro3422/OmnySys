/**
 * @fileoverview MCP session/runtime summary helpers.
 *
 * @module shared/compiler/compiler-runtime-metrics-sessions
 */

import {
  buildToleratedDuplicateClientSet,
  normalizeClientId
} from './compiler-runtime-metrics-sessions-format.js';
import {
  buildClientSyncDiagnostics,
  buildEmptyMcpSessionMetrics,
  buildMcpSessionMetricsResult,
  collectSessionDbSnapshot,
  resolveSessionCountDrift,
  resolveMcpSessionMetricsBaseline,
  resolveSessionSyncGraceMs
} from './compiler-runtime-metrics-sessions-state.js';

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
  const empty = buildEmptyMcpSessionMetrics({
    runtimeSessionCount,
    persistenceState
  });

  const baseline = resolveMcpSessionMetricsBaseline({
    sessionManager,
    sessionDbSnapshot,
    persistenceState,
    empty
  });

  if (baseline.earlyReturn) {
    return baseline.earlyReturn;
  }

  const {
    totalPersistent,
    totalPersistentActive,
    uniqueClients,
    clientsWithDuplicates,
    duplicateDetails
  } = baseline;
  const toleratedDuplicateDetails = duplicateDetails.filter((detail) => (
    toleratedDuplicateClientIds.has(normalizeClientId(detail.clientId))
  ));
  const actionableDuplicateDetails = duplicateDetails.filter((detail) => (
    !toleratedDuplicateClientIds.has(normalizeClientId(detail.clientId))
  ));
  const toleratedDuplicateClients = toleratedDuplicateDetails.length;
  const actionableDuplicateClients = actionableDuplicateDetails.length;
  const multiClientActive = uniqueClients > 1;
  const sessionSyncGraceMs = sessionDbSnapshot?.freshnessWindowMs ?? resolveSessionSyncGraceMs();
  const sessionCountDrift = resolveSessionCountDrift({
    hasRuntimeSessionCount,
    runtimeSessionCount,
    totalPersistentActive,
    sessionSnapshot: sessionDbSnapshot,
    sessionSyncGraceMs
  });
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
    sessionSnapshot: sessionDbSnapshot,
    sessionSyncGraceMs,
    recentErrors
  });
  const transportOriginCounts = sessionDbSnapshot?.transportOriginCounts || {};
  return {
    ...buildMcpSessionMetricsResult({
      hasRuntimeSessionCount,
      runtimeSessionCount,
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
      clientSync,
      transportOriginCounts,
      sessionSnapshot: sessionDbSnapshot
    }),
    transportOriginCounts
  };
}
