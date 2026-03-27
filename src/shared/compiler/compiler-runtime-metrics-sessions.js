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

export function collectMcpSessionMetrics(sessionManager, options = {}) {
  const hasRuntimeSessionCount = Number.isFinite(options.runtimeSessionCount);
  const runtimeSessionCount = hasRuntimeSessionCount ? options.runtimeSessionCount : null;
  const toleratedDuplicateClientIds = buildToleratedDuplicateClientSet(options.toleratedDuplicateClientIds);
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
    summary: runtimeSessionCount > 0
      ? `${runtimeSessionCount} runtime session(s), session persistence unavailable`
      : 'No active MCP sessions'
  };

  if (!sessionManager?.getDedupStats || !sessionManager?.getAllSessions) {
    return empty;
  }

  const dedupStats = sessionManager.getDedupStats();
  if (!dedupStats || dedupStats.error) {
    return {
      ...empty,
      error: dedupStats?.error || 'session summary unavailable'
    };
  }

  const totalPersistent = sessionManager.getAllSessions(false).length;
  const totalPersistentActive = sessionManager.getAllSessions(true).length;
  const uniqueClients = dedupStats.uniqueClients || 0;
  const clientsWithDuplicates = dedupStats.clientsWithDuplicates || 0;
  const duplicateDetails = dedupStats.duplicateDetails || [];
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
    ? runtimeSessionCount > totalPersistentActive
    : false;
  const multiClientChurn = actionableDuplicateClients > 0 || sessionCountDrift;

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
    summary: buildMcpSessionSummaryText({
      hasRuntimeSessionCount,
      runtimeSessionCount,
      totalPersistentActive,
      uniqueClients,
      clientsWithDuplicates,
      toleratedDuplicateClients
    })
  };
}
