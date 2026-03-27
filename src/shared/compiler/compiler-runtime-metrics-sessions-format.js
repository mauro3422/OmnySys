/**
 * @fileoverview Formatting helpers for MCP session runtime metrics.
 *
 * @module shared/compiler/compiler-runtime-metrics-sessions-format
 */

export function formatMcpSessionSummary({
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

export function buildMcpSessionSummaryText(summaryOptions) {
  return formatMcpSessionSummary(summaryOptions);
}

export function normalizeClientId(value) {
  return String(value || '').trim().toLowerCase();
}

export function buildToleratedDuplicateClientSet(extraClientIds = []) {
  return new Set([
    'cline',
    ...extraClientIds.map((clientId) => normalizeClientId(clientId)).filter(Boolean)
  ]);
}
