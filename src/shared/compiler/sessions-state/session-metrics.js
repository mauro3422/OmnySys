/**
 * @fileoverview MCP session metrics result builders.
 * Combines session summary, transport provenance, and client sync diagnostics.
 *
 * @module shared/compiler/sessions-state/session-metrics
 */

import { buildMcpSessionSummaryText } from '../compiler-runtime-metrics-sessions-format.js';
import { buildMcpSessionTransportProvenance } from './transport-provenance.js';

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
  clientSync = null,
  transportOriginCounts = {},
  sessionSnapshot = null
} = {}) {
  const sessionSummary = buildMcpSessionSummaryText({
    hasRuntimeSessionCount,
    runtimeSessionCount,
    totalPersistentActive,
    uniqueClients,
    clientsWithDuplicates,
    toleratedDuplicateClients
  });
  const transportProvenance = buildMcpSessionTransportProvenance({
    transportOriginCounts,
    sessionSnapshot,
    transportSessionStateCounts: sessionSnapshot?.transportSessionStateCounts || {},
    transportRequestPhaseCounts: sessionSnapshot?.transportRequestPhaseCounts || {},
    transportClientRouteIdCounts: sessionSnapshot?.transportClientRouteIdCounts || {},
    transportSessionHeaderPresentCount: sessionSnapshot?.transportSessionHeaderPresentCount || 0,
    transportSessionHeaderMissingCount: sessionSnapshot?.transportSessionHeaderMissingCount || 0,
    transportHandshakeSignatureCounts: sessionSnapshot?.transportHandshakeSignatureCounts || {},
    runtimeSessionCount,
    totalPersistentActive,
    sessionCountDrift,
    multiClientChurn,
    recentSessionCount: sessionSnapshot?.recentSessionCount || 0,
    uniqueClients,
    clientsWithDuplicates
  });
  const summaryParts = [sessionSummary];
  if (clientSync?.state !== 'fresh') {
    summaryParts.push(`client sync=${clientSync?.state || 'missing'}`);
  }
  if (transportProvenance.state !== 'fresh') {
    summaryParts.push(`transport=${transportProvenance.state}`);
  }
  if (transportProvenance.transportAlertState && transportProvenance.transportAlertState !== 'fresh') {
    summaryParts.push(`alerts=${transportProvenance.transportAlertState}`);
  }
  const annotatedSummary = summaryParts.join(' | ');

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
    transportOriginCounts: transportProvenance.transportOriginCounts,
    transportOriginTotal: transportProvenance.transportOriginTotal,
    transportOriginDistinctCount: transportProvenance.transportOriginDistinctCount,
    transportOriginKnownCount: transportProvenance.transportOriginKnownCount,
    dominantTransportOrigin: transportProvenance.dominantTransportOrigin,
    dominantTransportOriginCount: transportProvenance.dominantTransportOriginCount,
    transportOriginMix: transportProvenance.transportOriginMix,
    transportSessionStateCounts: transportProvenance.transportSessionStateCounts,
    transportRequestPhaseCounts: transportProvenance.transportRequestPhaseCounts,
    transportClientRouteIdCounts: transportProvenance.transportClientRouteIdCounts,
    transportSessionHeaderPresentCount: transportProvenance.transportSessionHeaderPresentCount,
    transportSessionHeaderMissingCount: transportProvenance.transportSessionHeaderMissingCount,
    transportHandshakeSignatureCounts: transportProvenance.transportHandshakeSignatureCounts,
    transportProvenanceState: transportProvenance.state,
    transportProvenanceHealthy: transportProvenance.healthy,
    transportProvenanceTrustworthy: transportProvenance.trustworthy,
    transportProvenanceReason: transportProvenance.reason,
    transportProvenanceRecommendation: transportProvenance.recommendation,
    transportProvenanceEvidence: transportProvenance.evidence,
    transportProvenanceSummary: transportProvenance.summary,
    transportAlertState: transportProvenance.transportAlertState,
    transportAlertCount: transportProvenance.transportAlertCount,
    transportAlertHealthy: transportProvenance.transportAlertHealthy,
    transportAlertTrustworthy: transportProvenance.transportAlertTrustworthy,
    transportAlertReason: transportProvenance.transportAlertReason,
    transportAlertRecommendation: transportProvenance.transportAlertRecommendation,
    transportAlertEvidence: transportProvenance.transportAlertEvidence,
    transportAlerts: transportProvenance.transportAlerts,
    transportAlertSummary: transportProvenance.transportAlertSummary,
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
    transportOriginCounts: {},
    transportOriginTotal: 0,
    transportOriginDistinctCount: 0,
    transportOriginKnownCount: 0,
    dominantTransportOrigin: 'unknown',
    dominantTransportOriginCount: 0,
    transportOriginMix: [],
    transportSessionStateCounts: {},
    transportRequestPhaseCounts: {},
    transportClientRouteIdCounts: {},
    transportHandshakeSignatureCounts: {},
    transportSessionHeaderPresentCount: 0,
    transportSessionHeaderMissingCount: 0,
    transportProvenanceState: blocked ? 'watchful' : 'missing',
    transportProvenanceHealthy: false,
    transportProvenanceTrustworthy: blocked ? false : false,
    transportProvenanceReason: blocked
      ? 'Transport provenance is unavailable while session persistence is unavailable.'
      : 'Transport provenance is not available yet.',
    transportProvenanceRecommendation: blocked
      ? 'Restore session persistence before trusting transport provenance.'
      : 'Attach explicit transport provenance headers so the daemon can distinguish direct HTTP, stdio bridge and fallback clients.',
    transportProvenanceEvidence: {
      persistenceState,
      runtimeSessionCount
    },
    transportProvenanceSummary: blocked
      ? 'transport provenance watchful: session persistence unavailable'
      : null,
    transportAlertState: blocked ? 'watchful' : 'missing',
    transportAlertCount: 0,
    transportAlertHealthy: false,
    transportAlertTrustworthy: blocked ? false : false,
    transportAlertReason: blocked
      ? 'Transport alert data is unavailable while session persistence is unavailable.'
      : 'Transport alert data is not available yet.',
    transportAlertRecommendation: blocked
      ? 'Restore session persistence before trusting transport alerts.'
      : 'Attach explicit transport provenance headers so transport alerts can be computed.',
    transportAlertEvidence: {
      persistenceState,
      runtimeSessionCount
    },
    transportAlerts: [],
    transportAlertSummary: blocked
      ? 'transport alerts watchful: session persistence unavailable'
      : 'transport alert data unavailable',
    summary: runtimeSessionCount > 0
      ? `${runtimeSessionCount} runtime session(s), ${persistenceAvailable ? 'session persistence available' : 'session persistence unavailable (memory fallback)'}${blocked ? ' | client sync=blocked' : ''}${blocked ? ' | transport=watchful' : ''}`
      : 'No active MCP sessions'
  };
}
