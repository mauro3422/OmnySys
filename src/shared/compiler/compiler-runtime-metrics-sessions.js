/**
 * @fileoverview MCP session/runtime summary helpers.
 *
 * @module shared/compiler/compiler-runtime-metrics-sessions
 */

function formatMcpSessionSummary({
  hasRuntimeSessionCount,
  runtimeSessionCount,
  totalPersistentActive,
  uniqueClients,
  clientsWithDuplicates,
  toleratedDuplicateClients
}) {
  const toleratedSuffix = toleratedDuplicateClients > 0
    ? `, ${toleratedDuplicateClients} tolerated`
    : '';

  return [
    hasRuntimeSessionCount ? `${runtimeSessionCount} runtime` : null,
    `${totalPersistentActive} persistent active`,
    `${uniqueClients} client${uniqueClients === 1 ? '' : 's'}`,
    clientsWithDuplicates > 0
      ? `${clientsWithDuplicates} duplicate client bucket${clientsWithDuplicates === 1 ? '' : 's'}${toleratedSuffix}`
      : 'no duplicate client buckets'
  ].filter(Boolean).join(', ');
}

function buildMcpSessionSummaryText(summaryOptions) {
  return formatMcpSessionSummary(summaryOptions);
}

function normalizeClientId(value) {
  return String(value || '').trim().toLowerCase();
}

function buildToleratedDuplicateClientSet(extraClientIds = []) {
  return new Set([
    'cline',
    ...extraClientIds.map((clientId) => normalizeClientId(clientId)).filter(Boolean)
  ]);
}

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
    summary: formatMcpSessionSummary({
      hasRuntimeSessionCount,
      runtimeSessionCount,
      totalPersistentActive,
      uniqueClients,
      clientsWithDuplicates,
      toleratedDuplicateClients
    })
  };
}

export function getMcpSessionSummary(sessionManager, options = {}) {
  return collectMcpSessionMetrics(sessionManager, options);
}
