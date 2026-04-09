export function shouldPreconnectBridgeTransport({ lastSessionId = null, lastDaemonHealth = null } = {}) {
  const activeSessionCount = Number(lastDaemonHealth?.sessions || 0);

  return Boolean(
    lastSessionId &&
    lastDaemonHealth?.healthy === true &&
    Number.isFinite(activeSessionCount) &&
    activeSessionCount > 0
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
