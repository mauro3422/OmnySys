/**
 * @fileoverview MCP session transport provenance analysis.
 * Builds a complete provenance report with origin mix, alert summary, and health state.
 *
 * @module shared/compiler/sessions-state/transport-provenance
 */

import { asNumber } from '../core-utils.js';
import { normalizeTransportCountMap, normalizeTransportOriginCounts } from './utils.js';
import { deriveTransportAlerts } from './transport-alerts.js';

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
  clientsWithDuplicates = 0,
  sessionSnapshot = null
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
    recentSessionCount: sessionSnapshot?.recentSessionCount || 0,
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
