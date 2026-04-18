/**
 * @fileoverview Transport alert derivation for MCP sessions.
 * Detects mixed origins, unknown origins, session churn, and stale handshake replays.
 *
 * @module shared/compiler/sessions-state/transport-alerts
 */

import { asNumber } from '../core-utils.js';
import {
  buildTransportAlert,
  normalizeTransportCountMap,
  normalizeTransportOriginCounts,
  summarizeTransportAlertState
} from './utils.js';

function detectTransportOriginSignals(originCounts, originMix) {
  return {
    hasKnownProvenance: originMix.length > 0,
    hasUnknownOrigin: asNumber(originCounts.unknown, 0) > 0,
    hasHttpDirect: asNumber(originCounts.http_direct, 0) > 0,
    hasStdioBridge: asNumber(originCounts.stdio_bridge, 0) > 0,
    hasShellFallback: asNumber(originCounts.shell_http_fallback, 0) > 0,
    hasMixedOrigins: originMix.length > 1
  };
}

function detectReplaySignals(handshakeSignatureCounts, transportSessionHeaderMissingCount, activeClientChurn, recentChurn) {
  const handshakeReplaySignals = Object.entries(handshakeSignatureCounts)
    .filter(([signature, count]) => signature !== 'unknown' && asNumber(count, 0) > 1);
  const handshakeHeaderMissing = asNumber(transportSessionHeaderMissingCount, 0) > 0;
  const replayLikely = handshakeReplaySignals.length > 0
    || (handshakeHeaderMissing && (activeClientChurn || recentChurn));
  return { handshakeReplaySignals, handshakeHeaderMissing, replayLikely };
}

function buildOriginMixAlert(originCounts, originMix) {
  const hasHttpDirect = asNumber(originCounts.http_direct, 0) > 0;
  const hasStdioBridge = asNumber(originCounts.stdio_bridge, 0) > 0;
  const mixDetail = originMix.map((item) => `${item.origin}:${item.count}`).join(', ');

  return buildTransportAlert({
    code: 'mixed_transport_provenance',
    severity: 'medium',
    state: 'watchful',
    reason: hasHttpDirect && hasStdioBridge
      ? `HTTP-direct and stdio-bridge sessions are active together (${mixDetail}).`
      : `Multiple transport origins are active (${mixDetail}).`,
    recommendation: 'Keep client provenance explicit so direct HTTP clients and stdio-bridge clients are never conflated.',
    evidence: {
      transportOriginCounts: originCounts,
      transportOriginMix: originMix,
      transportClientRouteIdCounts: {}
    }
  });
}

function buildUnknownOriginAlert(originCounts, originMix) {
  const mixDetail = originMix.map((item) => `${item.origin}:${item.count}`).join(', ');
  const isOnlyOrigin = originMix.length === 1;

  return buildTransportAlert({
    code: 'transport_origin_unknown',
    severity: isOnlyOrigin ? 'high' : 'medium',
    state: isOnlyOrigin ? 'blocked' : 'watchful',
    reason: `Some sessions are missing transport provenance (${mixDetail}).`,
    recommendation: 'Attach explicit transport provenance headers so the daemon can distinguish direct HTTP, stdio bridge and fallback clients.',
    evidence: { transportOriginCounts: originCounts, transportClientRouteIdCounts: {} }
  });
}

function buildChurnAlert(recentSessionCount, uniqueClients, recentChurn, sessionCountDrift, clientsWithDuplicates, totalPersistentActive, clientRouteIdCounts) {
  return buildTransportAlert({
    code: 'session_churn_excessive',
    severity: recentChurn ? 'high' : 'medium',
    state: 'watchful',
    reason: `Recent session churn is elevated (${asNumber(recentSessionCount, 0)} recent sessions across ${asNumber(uniqueClients, 0)} client(s)).`,
    recommendation: 'Reduce reconnect churn and keep one active session per client route whenever possible.',
    evidence: {
      recentSessionCount, totalPersistentActive, uniqueClients, clientsWithDuplicates,
      sessionCountDrift, multiClientChurn: false, transportClientRouteIdCounts: clientRouteIdCounts
    }
  });
}

function buildReplayAlert(handshakeReplaySignals, handshakeHeaderMissing, activeClientChurn, recentChurn, sessionStateCounts, requestPhaseCounts, clientRouteIdCounts, transportSessionHeaderPresentCount, transportSessionHeaderMissingCount, handshakeSignatureCounts) {
  const replayBlocking = handshakeHeaderMissing && (activeClientChurn || recentChurn);
  const replayDetail = handshakeReplaySignals.map(([sig, count]) => `${sig}:${count}`).join(', ');

  return buildTransportAlert({
    code: 'stale_handshake_replay',
    severity: replayBlocking ? 'high' : 'medium',
    state: replayBlocking ? 'blocked' : 'watchful',
    reason: handshakeReplaySignals.length > 0
      ? `Recent session initializations are missing transport headers, so stale handshake replay cannot be ruled out.`
      : handshakeReplaySignals.length > 0
        ? `Repeated handshake signatures are being observed (${replayDetail}).`
      : 'Recent session initializations are missing transport headers, so stale handshake replay cannot be ruled out.',
    recommendation: 'Persist a handshake signature and route identity for every session so replayed or stale initialize flows are measurable.',
    evidence: {
      transportSessionHeaderPresentCount, transportSessionHeaderMissingCount,
      transportSessionStateCounts: sessionStateCounts, transportRequestPhaseCounts: requestPhaseCounts,
      transportClientRouteIdCounts: clientRouteIdCounts, transportHandshakeSignatureCounts: handshakeSignatureCounts
    }
  });
}

export function deriveTransportAlerts({
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
  const originMix = normalizeTransportOriginCounts(originCounts);
  const signals = detectTransportOriginSignals(originCounts, originMix);
  const activeClientChurn = sessionCountDrift || multiClientChurn || clientsWithDuplicates > 0;
  const recentChurn = asNumber(recentSessionCount, 0) >= Math.max(4, asNumber(totalPersistentActive, 0) + 1);
  const replay = detectReplaySignals(transportHandshakeSignatureCounts, transportSessionHeaderMissingCount, activeClientChurn, recentChurn);

  const alerts = [];
  if (signals.hasMixedOrigins && (signals.hasUnknownOrigin || signals.hasShellFallback || activeClientChurn || recentChurn)) {
    alerts.push(buildOriginMixAlert(originCounts, originMix));
  }
  if (signals.hasUnknownOrigin) alerts.push(buildUnknownOriginAlert(originCounts, originMix));
  if (recentChurn || activeClientChurn) {
    alerts.push(buildChurnAlert(recentSessionCount, uniqueClients, recentChurn, sessionCountDrift, clientsWithDuplicates, totalPersistentActive, transportClientRouteIdCounts));
  }
  if (replay.handshakeReplaySignals.length > 0 || replay.replayLikely) {
    alerts.push(buildReplayAlert(replay.handshakeReplaySignals, replay.handshakeHeaderMissing, activeClientChurn, recentChurn, transportSessionStateCounts, transportRequestPhaseCounts, transportClientRouteIdCounts, transportSessionHeaderPresentCount, transportSessionHeaderMissingCount, transportHandshakeSignatureCounts));
  }

  const alertState = summarizeTransportAlertState(alerts, signals.hasKnownProvenance);
  const alertRecommendation = alerts[0]?.recommendation
    || (signals.hasKnownProvenance
      ? 'Keep transport alert buckets active so drift remains visible.'
      : 'Attach explicit transport provenance headers so direct HTTP and stdio bridge clients can be distinguished.');
  const alertReason = !signals.hasKnownProvenance
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
      transportSessionStateCounts: normalizeTransportCountMap(transportSessionStateCounts),
      transportRequestPhaseCounts: normalizeTransportCountMap(transportRequestPhaseCounts),
      transportSessionHeaderPresentCount,
      transportSessionHeaderMissingCount,
      transportHandshakeSignatureCounts: normalizeTransportCountMap(transportHandshakeSignatureCounts),
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
