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

function normalizeTransportOriginCounts(transportOriginCounts = {}) {
  return Object.entries(transportOriginCounts)
    .map(([origin, count]) => ({
      origin: String(origin || 'unknown').trim() || 'unknown',
      count: asNumber(count, 0)
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.origin.localeCompare(right.origin));
}

function normalizeTransportCountMap(countMap = {}) {
  return Object.entries(countMap)
    .reduce((acc, [key, count]) => {
      const normalizedKey = String(key || 'unknown').trim() || 'unknown';
      const normalizedCount = asNumber(count, 0);
      if (normalizedCount > 0) {
        acc[normalizedKey] = normalizedCount;
      }
      return acc;
    }, {});
}

function buildTransportAlert({
  code,
  severity = 'medium',
  state = 'watchful',
  reason,
  recommendation,
  evidence = {}
} = {}) {
  return {
    code,
    severity,
    state,
    blocking: state === 'blocked',
    reason,
    recommendation,
    evidence
  };
}

function summarizeTransportAlertState(alerts = [], hasKnownProvenance = false) {
  if (!hasKnownProvenance) {
    return 'missing';
  }

  if (!Array.isArray(alerts) || alerts.length === 0) {
    return 'fresh';
  }

  return alerts.some((alert) => alert.state === 'blocked') ? 'blocked' : 'watchful';
}

function deriveTransportAlerts({
  transportOriginCounts = {},
  transportSessionStateCounts = {},
  transportRequestPhaseCounts = {},
  transportClientRouteIdCounts = {},
  transportSessionHeaderPresentCount = 0,
  transportSessionHeaderMissingCount = 0,
  transportHandshakeSignatureCounts = {},
  runtimeSessionCount = null,
  totalPersistentActive = 0,
  sessionCountDrift = false,
  multiClientChurn = false,
  recentSessionCount = 0,
  uniqueClients = 0,
  clientsWithDuplicates = 0
} = {}) {
  const originCounts = normalizeTransportCountMap(transportOriginCounts);
  const sessionStateCounts = normalizeTransportCountMap(transportSessionStateCounts);
  const requestPhaseCounts = normalizeTransportCountMap(transportRequestPhaseCounts);
  const clientRouteIdCounts = normalizeTransportCountMap(transportClientRouteIdCounts);
  const handshakeSignatureCounts = normalizeTransportCountMap(transportHandshakeSignatureCounts);
  const originMix = normalizeTransportOriginCounts(originCounts);
  const hasKnownProvenance = originMix.length > 0;
  const hasUnknownOrigin = asNumber(originCounts.unknown, 0) > 0;
  const hasHttpDirect = asNumber(originCounts.http_direct, 0) > 0;
  const hasStdioBridge = asNumber(originCounts.stdio_bridge, 0) > 0;
  const hasShellFallback = asNumber(originCounts.shell_http_fallback, 0) > 0;
  const hasMixedOrigins = originMix.length > 1;
  const activeClientChurn = sessionCountDrift || multiClientChurn || clientsWithDuplicates > 0;
  const recentChurn = asNumber(recentSessionCount, 0) >= Math.max(4, asNumber(totalPersistentActive, 0) + 1);
  const handshakeHeaderMissing = asNumber(transportSessionHeaderMissingCount, 0) > 0;
  const handshakeReplaySignals = Object.entries(handshakeSignatureCounts).filter(([signature, count]) => signature !== 'unknown' && count > 1);
  const replayLikely = handshakeReplaySignals.length > 0
    || (handshakeHeaderMissing && (activeClientChurn || recentChurn || asNumber(requestPhaseCounts['http-initialize'], 0) > 1));

  const alerts = [];

  if (hasMixedOrigins) {
    alerts.push(buildTransportAlert({
      code: 'mixed_transport_provenance',
      severity: hasHttpDirect && hasStdioBridge ? 'high' : 'medium',
      state: hasHttpDirect && hasStdioBridge ? 'blocked' : 'watchful',
      reason: hasHttpDirect && hasStdioBridge
        ? `HTTP-direct and stdio-bridge sessions are active together (${originMix.map((item) => `${item.origin}:${item.count}`).join(', ')}).`
        : `Multiple transport origins are active (${originMix.map((item) => `${item.origin}:${item.count}`).join(', ')}).`,
      recommendation: 'Keep client provenance explicit so direct HTTP clients and stdio-bridge clients are never conflated.',
      evidence: {
        transportOriginCounts: originCounts,
        transportOriginMix: originMix,
        transportClientRouteIdCounts: clientRouteIdCounts
      }
    }));
  }

  if (hasUnknownOrigin) {
    alerts.push(buildTransportAlert({
      code: 'transport_origin_unknown',
      severity: originMix.length === 1 ? 'high' : 'medium',
      state: originMix.length === 1 ? 'blocked' : 'watchful',
      reason: `Some sessions are missing transport provenance (${originMix.map((item) => `${item.origin}:${item.count}`).join(', ')}).`,
      recommendation: 'Attach explicit transport provenance headers so the daemon can distinguish direct HTTP, stdio bridge and fallback clients.',
      evidence: {
        transportOriginCounts: originCounts,
        transportClientRouteIdCounts: clientRouteIdCounts
      }
    }));
  }

  if (recentChurn || activeClientChurn) {
    alerts.push(buildTransportAlert({
      code: 'session_churn_excessive',
      severity: recentChurn && (sessionCountDrift || clientsWithDuplicates > 0) ? 'high' : 'medium',
      state: recentChurn && (sessionCountDrift || clientsWithDuplicates > 0) ? 'blocked' : 'watchful',
      reason: `Recent session churn is elevated (${asNumber(recentSessionCount, 0)} recent sessions across ${asNumber(uniqueClients, 0)} client(s)).`,
      recommendation: 'Reduce reconnect churn and keep one active session per client route whenever possible.',
      evidence: {
        recentSessionCount,
        totalPersistentActive,
        uniqueClients,
        clientsWithDuplicates,
        sessionCountDrift,
        multiClientChurn,
        transportClientRouteIdCounts: clientRouteIdCounts
      }
    }));
  }

  if (handshakeReplaySignals.length > 0 || replayLikely) {
    const replayBlocking = handshakeReplaySignals.length > 0
      || (handshakeHeaderMissing && (activeClientChurn || recentChurn));
    alerts.push(buildTransportAlert({
      code: 'stale_handshake_replay',
      severity: replayBlocking ? 'high' : 'medium',
      state: replayBlocking ? 'blocked' : 'watchful',
      reason: handshakeReplaySignals.length > 0
        ? `Repeated handshake signatures are being observed (${handshakeReplaySignals.map(([signature, count]) => `${signature}:${count}`).join(', ')}).`
        : 'Recent session initializations are missing transport headers, so stale handshake replay cannot be ruled out.',
      recommendation: 'Persist a handshake signature and route identity for every session so replayed or stale initialize flows are measurable.',
      evidence: {
        transportSessionHeaderPresentCount,
        transportSessionHeaderMissingCount,
        transportSessionStateCounts: sessionStateCounts,
        transportRequestPhaseCounts: requestPhaseCounts,
        transportClientRouteIdCounts: clientRouteIdCounts,
        transportHandshakeSignatureCounts: handshakeSignatureCounts
      }
    }));
  }

  const alertState = summarizeTransportAlertState(alerts, hasKnownProvenance);
  const alertRecommendation = alerts[0]?.recommendation
    || (hasKnownProvenance
      ? 'Keep transport alert buckets active so drift remains visible.'
      : 'Attach explicit transport provenance headers so direct HTTP and stdio bridge clients can be distinguished.');
  const alertReason = !hasKnownProvenance
    ? 'Transport alert data is unavailable yet.'
    : alerts.length > 0
      ? alerts.map((alert) => alert.reason).join(' | ')
      : 'No transport alerts are currently active.';

  return {
    alerts,
    alertCount: alerts.length,
    alertState,
    alertHealthy: alertState === 'fresh',
    alertTrustworthy: alertState === 'fresh',
    alertReason,
    alertRecommendation,
    alertEvidence: {
      transportOriginCounts: originCounts,
      transportSessionStateCounts: sessionStateCounts,
      transportRequestPhaseCounts: requestPhaseCounts,
      transportSessionHeaderPresentCount,
      transportSessionHeaderMissingCount,
      transportHandshakeSignatureCounts: handshakeSignatureCounts,
      runtimeSessionCount,
      totalPersistentActive,
      sessionCountDrift,
      multiClientChurn,
      recentSessionCount,
      uniqueClients,
      clientsWithDuplicates
    }
  };
}

export function buildMcpSessionTransportProvenance({
  transportOriginCounts = {},
  transportSessionStateCounts = {},
  transportRequestPhaseCounts = {},
  transportClientRouteIdCounts = {},
  transportSessionHeaderPresentCount = 0,
  transportSessionHeaderMissingCount = 0,
  transportHandshakeSignatureCounts = {},
  runtimeSessionCount = null,
  totalPersistentActive = 0,
  sessionCountDrift = false,
  multiClientChurn = false,
  recentSessionCount = 0,
  uniqueClients = 0,
  clientsWithDuplicates = 0
} = {}) {
  const originMix = normalizeTransportOriginCounts(transportOriginCounts);
  const sessionStateCounts = normalizeTransportCountMap(transportSessionStateCounts);
  const requestPhaseCounts = normalizeTransportCountMap(transportRequestPhaseCounts);
  const clientRouteIdCounts = normalizeTransportCountMap(transportClientRouteIdCounts);
  const handshakeSignatureCounts = normalizeTransportCountMap(transportHandshakeSignatureCounts);
  const originCounts = originMix.reduce((acc, item) => {
    acc[item.origin] = item.count;
    return acc;
  }, {});
  const dominantOrigin = originMix[0] || { origin: 'unknown', count: 0 };
  const totalOriginCount = originMix.reduce((sum, item) => sum + item.count, 0);
  const distinctOriginCount = originMix.length;
  const knownOriginCount = originMix.filter((item) => item.origin !== 'unknown').length;
  const hasUnknownOrigin = asNumber(originCounts.unknown, 0) > 0;
  const hasHttpDirect = asNumber(originCounts.http_direct, 0) > 0;
  const hasStdioBridge = asNumber(originCounts.stdio_bridge, 0) > 0;
  const hasShellFallback = asNumber(originCounts.shell_http_fallback, 0) > 0;
  const hasMixedOrigins = distinctOriginCount > 1;
  const hasKnownProvenance = totalOriginCount > 0;
  const provenanceMix = originMix.map((item) => `${item.origin}:${item.count}`).join(', ');
  const freshnessSignals = [
    hasMixedOrigins,
    hasUnknownOrigin,
    hasShellFallback,
    hasHttpDirect && hasStdioBridge,
    sessionCountDrift,
    multiClientChurn
  ].some(Boolean);

  let state = 'missing';
  if (hasKnownProvenance) {
    state = freshnessSignals ? 'watchful' : 'fresh';
  } else if (runtimeSessionCount > 0 || totalPersistentActive > 0) {
    state = 'watchful';
  }

  const reason = !hasKnownProvenance
    ? 'Transport provenance is not available yet.'
    : freshnessSignals
      ? hasHttpDirect && hasStdioBridge
        ? `HTTP-direct and stdio-bridge sessions are active together (${provenanceMix}).`
        : hasUnknownOrigin
          ? `Some sessions are missing transport provenance (${provenanceMix}).`
          : hasShellFallback
            ? `Shell HTTP fallback is active alongside canonical transports (${provenanceMix}).`
            : `Multiple transport origins are active (${provenanceMix}).`
      : `Transport provenance is anchored to ${dominantOrigin.origin}.`;

  const recommendation = !hasKnownProvenance
    ? 'Attach explicit transport provenance headers so the daemon can distinguish direct HTTP, stdio bridge and fallback clients.'
    : freshnessSignals
      ? 'Standardize explicit client headers and route identity for HTTP-direct clients, and keep stdio-bridge clients on their own bridge lane.'
      : 'Keep transport provenance attached to every session so mixed-client drift remains visible.';
  const transportAlerts = deriveTransportAlerts({
      transportOriginCounts: originCounts,
      transportSessionStateCounts,
      transportRequestPhaseCounts,
      transportClientRouteIdCounts,
      transportSessionHeaderPresentCount,
      transportSessionHeaderMissingCount,
      transportHandshakeSignatureCounts,
    runtimeSessionCount,
    totalPersistentActive,
    sessionCountDrift,
    multiClientChurn,
    recentSessionCount,
    uniqueClients,
    clientsWithDuplicates
  });

  return {
    state,
    healthy: state === 'fresh',
    trustworthy: state !== 'missing' && transportAlerts.alertState !== 'blocked',
    reason,
    recommendation,
    transportOriginCounts: originCounts,
    transportOriginTotal: totalOriginCount,
    transportOriginDistinctCount: distinctOriginCount,
    transportOriginKnownCount: knownOriginCount,
    dominantTransportOrigin: dominantOrigin.origin,
    dominantTransportOriginCount: dominantOrigin.count,
    transportOriginMix: originMix,
    transportSessionStateCounts: sessionStateCounts,
    transportRequestPhaseCounts: requestPhaseCounts,
    transportClientRouteIdCounts,
    transportSessionHeaderPresentCount,
    transportSessionHeaderMissingCount,
    transportHandshakeSignatureCounts,
    transportAlertState: transportAlerts.alertState,
    transportAlertCount: transportAlerts.alertCount,
    transportAlertHealthy: transportAlerts.alertHealthy,
    transportAlertTrustworthy: transportAlerts.alertTrustworthy,
    transportAlertReason: transportAlerts.alertReason,
    transportAlertRecommendation: transportAlerts.alertRecommendation,
    transportAlertEvidence: transportAlerts.alertEvidence,
    transportAlerts: transportAlerts.alerts,
    transportAlertSummary: !hasKnownProvenance
      ? 'transport alert data unavailable'
      : transportAlerts.alertCount > 0
        ? `transport alerts ${transportAlerts.alertState}: ${transportAlerts.alerts.map((alert) => alert.code).join(', ')}`
        : 'transport alerts fresh',
    summary: !hasKnownProvenance
      ? 'transport provenance unavailable'
      : `transport provenance ${state}: ${provenanceMix}${transportAlerts.alertCount > 0 ? ` | alerts=${transportAlerts.alertState}` : ''}`,
    evidence: {
      runtimeSessionCount,
      totalPersistentActive,
      sessionCountDrift,
      multiClientChurn,
      transportOriginCounts: originCounts,
      transportOriginMix: originMix,
      transportSessionStateCounts,
      transportRequestPhaseCounts,
      transportClientRouteIdCounts,
      transportSessionHeaderPresentCount,
      transportSessionHeaderMissingCount,
      transportHandshakeSignatureCounts,
      transportAlerts: transportAlerts.alerts
    }
  };
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
