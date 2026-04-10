const VERIFIED_SESSION_STATES = new Set([
  'session-verified',
  'session-reused',
  'message-sent',
  'recovered-message-sent'
]);

export function shouldPreconnectBridgeTransport({
  lastSessionId = null,
  lastDaemonHealth = null,
  lastBridgeTransportState = null
} = {}) {
  const activeSessionCount = Number(lastDaemonHealth?.sessions || 0);

  return Boolean(
    lastSessionId &&
    lastDaemonHealth?.healthy === true &&
    Number.isFinite(activeSessionCount) &&
    activeSessionCount > 0 &&
    VERIFIED_SESSION_STATES.has(String(lastBridgeTransportState || '').trim())
  );
}

export function shouldPromoteBridgeTransportToSessionBound({
  transportBootstrappedSessionlessly = false,
  sessionId = null,
  messageMethod = null
} = {}) {
  return Boolean(
    transportBootstrappedSessionlessly &&
    sessionId &&
    messageMethod &&
    messageMethod !== 'initialize'
  );
}
