import { buildMcpSessionSummaryText } from '../compiler-runtime-metrics-sessions-format.js';

export function normalizeMcpSessionMetricsResult({
  hasRuntimeSessionCount,
  runtimeSessionCount,
  totalPersistent,
  totalPersistentActive,
  persistenceState,
  clientSync,
  transportProvenance,
  sessionSummary,
  sessionCountDrift,
  multiClientChurn,
  transportOriginCounts,
  sessionSnapshot
} = {}) {
  const persistenceAvailable = persistenceState?.available === true;
  const shouldPreferReconciliation = persistenceAvailable
    && Number(runtimeSessionCount || 0) > 0
    && Number(totalPersistentActive || 0) === 0;
  const normalizedClientSyncState = shouldPreferReconciliation && clientSync?.state === 'blocked'
    ? 'reconciling'
    : (clientSync?.state || 'missing');
  const normalizedTransportProvenanceState = shouldPreferReconciliation && transportProvenance.state === 'blocked'
    ? 'watchful'
    : transportProvenance.state;
  const normalizedTransportAlertState = shouldPreferReconciliation && transportProvenance.transportAlertState === 'blocked'
    ? 'watchful'
    : transportProvenance.transportAlertState;
  const summaryParts = [buildMcpSessionSummaryText({
    hasRuntimeSessionCount,
    runtimeSessionCount,
    totalPersistentActive,
    uniqueClients: clientSync?.evidence?.uniqueClients || 0,
    clientsWithDuplicates: clientSync?.evidence?.clientsWithDuplicates || 0,
    toleratedDuplicateClients: clientSync?.evidence?.toleratedDuplicateClients || 0
  })];
  if (normalizedClientSyncState !== 'fresh') summaryParts.push(`client sync=${normalizedClientSyncState}`);
  if (normalizedTransportProvenanceState !== 'fresh') summaryParts.push(`transport=${normalizedTransportProvenanceState}`);
  if (normalizedTransportAlertState && normalizedTransportAlertState !== 'fresh') summaryParts.push(`alerts=${normalizedTransportAlertState}`);

  return {
    sessionCountDrift: shouldPreferReconciliation ? false : sessionCountDrift,
    multiClientChurn,
    clientSyncState: normalizedClientSyncState,
    clientSyncSeverity: shouldPreferReconciliation && clientSync?.state === 'blocked' ? 'low' : (clientSync?.severity || 'low'),
    clientSyncHealthy: shouldPreferReconciliation && clientSync?.state === 'blocked' ? true : (clientSync?.healthy !== false),
    clientSyncTrustworthy: shouldPreferReconciliation && clientSync?.state === 'blocked' ? false : (clientSync?.trustworthy !== false),
    clientSyncReason: shouldPreferReconciliation && clientSync?.state === 'blocked'
      ? 'Runtime sessions are live while persistent active rows are still zero; waiting for bridge synchronization.'
      : (clientSync?.reason || 'Session summary unavailable.'),
    clientSyncRecommendation: shouldPreferReconciliation && clientSync?.state === 'blocked'
      ? 'Wait for the IDE bridge to reconnect or refresh the client MCP catalog.'
      : (clientSync?.recommendation || 'No client session drift data is available yet.'),
    clientSyncSummary: normalizedClientSyncState === 'fresh' ? null : `client sync ${normalizedClientSyncState}: ${clientSync?.reason || 'Session summary unavailable.'}`,
    transportProvenanceState: normalizedTransportProvenanceState,
    transportProvenanceHealthy: shouldPreferReconciliation && transportProvenance.state === 'blocked' ? false : transportProvenance.healthy,
    transportProvenanceTrustworthy: transportProvenance.trustworthy,
    transportProvenanceReason: transportProvenance.reason,
    transportProvenanceRecommendation: transportProvenance.recommendation,
    transportProvenanceEvidence: transportProvenance.evidence,
    transportAlertState: normalizedTransportAlertState,
    transportAlertCount: transportProvenance.transportAlertCount,
    transportAlertHealthy: shouldPreferReconciliation && transportProvenance.transportAlertState === 'blocked' ? false : transportProvenance.transportAlertHealthy,
    transportAlertTrustworthy: transportProvenance.transportAlertTrustworthy,
    transportAlertReason: transportProvenance.transportAlertReason,
    transportAlertRecommendation: transportProvenance.transportAlertRecommendation,
    transportAlertEvidence: transportProvenance.transportAlertEvidence,
    transportAlerts: transportProvenance.transportAlerts,
    transportAlertSummary: transportProvenance.transportAlertSummary,
    summary: summaryParts.join(' | ')
  };
}
