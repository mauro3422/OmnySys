import { buildMcpSessionSummaryText } from '../compiler-runtime-metrics-sessions-format.js';

export function normalizeMcpSessionMetricsResult(sessionMetrics = null) {
  if (!sessionMetrics || typeof sessionMetrics !== 'object') {
    return sessionMetrics;
  }

  const persistenceAvailable = sessionMetrics.persistenceState?.available === true;
  const runtimeSessionCount = Number(sessionMetrics.runtimeSessions || 0);
  const totalPersistentActive = Number(sessionMetrics.totalPersistentActive || 0);
  const shouldPreferReconciliation = persistenceAvailable
    && runtimeSessionCount > 0
    && totalPersistentActive === 0;

  if (!shouldPreferReconciliation) {
    return sessionMetrics;
  }

  const normalizedClientSyncState = sessionMetrics.clientSyncState === 'fresh'
    ? 'fresh'
    : 'reconciling';
  const normalizedTransportProvenanceState = sessionMetrics.transportProvenanceState === 'fresh'
    ? 'fresh'
    : 'watchful';
  const normalizedTransportAlertState = sessionMetrics.transportAlertState === 'fresh'
    ? 'fresh'
    : 'watchful';
  const summaryParts = [buildMcpSessionSummaryText({
    hasRuntimeSessionCount: Number.isFinite(runtimeSessionCount),
    runtimeSessionCount,
    totalPersistentActive,
    uniqueClients: Number(sessionMetrics.uniqueClients || 0),
    clientsWithDuplicates: Number(sessionMetrics.clientsWithDuplicates || 0),
    toleratedDuplicateClients: Number(sessionMetrics.toleratedDuplicateClients || 0)
  })];
  if (normalizedClientSyncState !== 'fresh') summaryParts.push(`client sync=${normalizedClientSyncState}`);
  if (normalizedTransportProvenanceState !== 'fresh') summaryParts.push(`transport=${normalizedTransportProvenanceState}`);
  if (normalizedTransportAlertState !== 'fresh') summaryParts.push(`alerts=${normalizedTransportAlertState}`);

  return {
    ...sessionMetrics,
    sessionCountDrift: false,
    clientSyncState: normalizedClientSyncState,
    clientSyncSeverity: sessionMetrics.clientSyncState === 'blocked' ? 'low' : (sessionMetrics.clientSyncSeverity || 'low'),
    clientSyncHealthy: sessionMetrics.clientSyncState === 'blocked' ? true : (sessionMetrics.clientSyncHealthy !== false),
    clientSyncTrustworthy: sessionMetrics.clientSyncState === 'blocked' ? false : (sessionMetrics.clientSyncTrustworthy !== false),
    clientSyncReason: sessionMetrics.clientSyncState === 'blocked'
      ? 'Runtime sessions are live while persistent active rows are still zero; waiting for bridge synchronization.'
      : (sessionMetrics.clientSyncReason || 'Session summary unavailable.'),
    clientSyncRecommendation: sessionMetrics.clientSyncState === 'blocked'
      ? 'Wait for the IDE bridge to reconnect or refresh the client MCP catalog.'
      : (sessionMetrics.clientSyncRecommendation || 'No client session drift data is available yet.'),
    clientSyncSummary: normalizedClientSyncState === 'fresh'
      ? null
      : `client sync ${normalizedClientSyncState}: ${sessionMetrics.clientSyncReason || 'Session summary unavailable.'}`,
    transportProvenanceState: normalizedTransportProvenanceState,
    transportProvenanceHealthy: sessionMetrics.transportProvenanceState === 'blocked'
      ? false
      : (sessionMetrics.transportProvenanceHealthy !== false),
    transportProvenanceTrustworthy: sessionMetrics.transportProvenanceTrustworthy !== false,
    transportProvenanceReason: sessionMetrics.transportProvenanceReason || null,
    transportProvenanceRecommendation: sessionMetrics.transportProvenanceRecommendation || null,
    transportProvenanceEvidence: sessionMetrics.transportProvenanceEvidence || null,
    transportAlertState: normalizedTransportAlertState,
    transportAlertCount: Number(sessionMetrics.transportAlertCount || 0),
    transportAlertHealthy: sessionMetrics.transportAlertState === 'blocked'
      ? false
      : (sessionMetrics.transportAlertHealthy !== false),
    transportAlertTrustworthy: sessionMetrics.transportAlertTrustworthy !== false,
    transportAlertReason: sessionMetrics.transportAlertReason || null,
    transportAlertRecommendation: sessionMetrics.transportAlertRecommendation || null,
    transportAlertEvidence: sessionMetrics.transportAlertEvidence || null,
    transportAlerts: sessionMetrics.transportAlerts || [],
    transportAlertSummary: normalizedTransportAlertState === 'fresh'
      ? 'transport alerts fresh'
      : (sessionMetrics.transportAlertSummary || null),
    summary: summaryParts.join(' | ')
  };
}
