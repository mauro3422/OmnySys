/**
 * Recovery helpers for the MCP stdio bridge.
 */

import {
  failBridgePendingRequests,
  log,
  sendBridgeRetryableError
} from './stdio-bridge-lifecycle.js';
import { waitForDaemonHealthy, waitMs } from './stdio-bridge-health.js';
import { waitForBridgeSessionId } from './stdio-bridge-helpers.js';
import { buildHealthUrl } from '../../shared/mcp-endpoints.js';

const DAEMON_HEALTH = process.env.OMNYSYS_HEALTH_URL || buildHealthUrl({
  port: 9999,
  env: process.env,
  platform: process.platform
});
const DAEMON_RECOVERY_TIMEOUT_MS = Number(process.env.OMNYSYS_DAEMON_RECOVERY_TIMEOUT_MS || 180000);
const DAEMON_RECOVERY_POLL_MS = Number(process.env.OMNYSYS_DAEMON_RECOVERY_POLL_MS || 1500);
const BRIDGE_RECOVERY_BACKOFF_MS = Number(process.env.OMNYSYS_BRIDGE_RECOVERY_BACKOFF_MS || 250);
const BRIDGE_RECOVERY_DUPLICATE_WINDOW_MS = Number(process.env.OMNYSYS_BRIDGE_RECOVERY_DUPLICATE_WINDOW_MS || 1500);

function shouldForceFreshSession(trigger, options = {}) {
  if (options.forceFreshSession === true) {
    return true;
  }

  return /transport closed|server rejected request after daemon restart|SESSION_EXPIRED|session expired|Invalid session|session not found|invalid or missing MCP session|missing MCP session|Conflict|BRIDGE_FORWARD_FAILED|fetch failed|Failed to fetch|socket hang up|terminated/i.test(trigger);
}

function getRecoverySignature(trigger, options = {}) {
  return `${String(trigger || 'unknown')}::${options.forceFreshSession === true ? 'fresh' : 'reuse'}`;
}

function shouldSkipDuplicateRecovery(state, trigger, options = {}) {
  const signature = getRecoverySignature(trigger, options);
  const now = Date.now();
  if (state.lastRecoverySignature === signature && (now - (state.lastRecoveryAt || 0)) < BRIDGE_RECOVERY_DUPLICATE_WINDOW_MS) {
    return true;
  }
  state.lastRecoverySignature = signature;
  state.lastRecoveryAt = now;
  return false;
}

function clearStaleBridgeSession(state, forceFreshSession) {
  if (!forceFreshSession) {
    return null;
  }

  const staleSessionId = state.lastSessionId || null;
  state.lastSessionId = null;
  return staleSessionId;
}

function getCurrentBridgeSessionId(state) {
  return state.lastSessionId || state.httpTransport?._sessionId || null;
}

function isBridgeTransportAborted(transport) {
  return Boolean(transport?._abortController?.signal?.aborted);
}

function detectDaemonPidChange(state, health) {
  const previousPid = Number(state.lastDaemonPid || state.lastDaemonHealth?.pid || 0);
  const currentPid = Number(health?.pid || 0);

  return {
    previousPid: Number.isFinite(previousPid) && previousPid > 0 ? previousPid : null,
    currentPid: Number.isFinite(currentPid) && currentPid > 0 ? currentPid : null,
    pidChanged: Boolean(
      Number.isFinite(previousPid) && previousPid > 0 &&
      Number.isFinite(currentPid) && currentPid > 0 &&
      previousPid !== currentPid
    )
  };
}

async function runBridgeRecovery(state, trigger, connectBridgeTransport, options = {}) {
  log(`Starting bridge recovery (${trigger})...`);
  log(`Recovery context: forceFreshSession=${options.forceFreshSession === true}, currentSession=${state.lastSessionId || state.httpTransport?._sessionId || 'none'}, reconnecting=${Boolean(state.isReconnecting)}`);

  const health = await waitForDaemonHealthy(DAEMON_HEALTH, {
    timeoutMs: DAEMON_RECOVERY_TIMEOUT_MS,
    pollMs: DAEMON_RECOVERY_POLL_MS,
    label: 'daemon recovery',
    log
  });

  const previousDaemonHealth = state.lastDaemonHealth || null;
  const daemonPidChange = detectDaemonPidChange({
    lastDaemonPid: state.lastDaemonPid,
    lastDaemonHealth: previousDaemonHealth
  }, health);

  state.lastDaemonHealth = health || null;
  state.lastDaemonHealthAt = new Date().toISOString();
  if (Number.isFinite(Number(health?.pid)) && Number(health.pid) > 0) {
    state.lastDaemonPid = Number(health.pid);
  }
  state.persistBridgeSessionSnapshot?.({
    bridgeTransportState: health?.healthy ? 'recovery-daemon-healthy' : 'recovery-daemon-unhealthy'
  });

  if (!health?.healthy) {
    log(`Daemon recovery failed. sessions=${health?.sessions ?? 'unknown'} pid=${health?.pid ?? 'unknown'}. Will retry bridge recovery instead of shutting down.`);
    setTimeout(() => {
      if (!state.isReconnecting) {
        void scheduleBridgeRecovery(state, `${trigger}: daemon still unhealthy`, connectBridgeTransport, {
          ...options,
          backoffMs: Math.max(BRIDGE_RECOVERY_BACKOFF_MS * 4, 1000),
          forceFreshSession: true
        });
      }
    }, Math.max(BRIDGE_RECOVERY_BACKOFF_MS * 4, 1000));
    return;
  }

  log('Daemon recovered. Reconnecting HTTP transport...');
  try {
    const forceFreshSession = shouldForceFreshSession(trigger, options) || daemonPidChange.pidChanged;
    log(`Reconnect plan: forceFreshSession=${forceFreshSession}, previousPid=${daemonPidChange.previousPid ?? 'n/a'}, currentPid=${daemonPidChange.currentPid ?? 'n/a'}, pidChanged=${daemonPidChange.pidChanged}`);
    if (daemonPidChange.pidChanged || (health.sessions === 0 && (state.lastSessionId || state.httpTransport?._sessionId))) {
      const reason = daemonPidChange.pidChanged
        ? `daemon pid changed (${daemonPidChange.previousPid} -> ${daemonPidChange.currentPid})`
        : 'daemon reported zero sessions';
      log(`Clearing stale bridge session before reconnect (${reason}).`);
      state.lastSessionId = null;
      state.cachedInitializeResponse = null;
      state.localInitializeHandled = false;
      state.persistBridgeSessionSnapshot?.({
        bridgeTransportState: daemonPidChange.pidChanged ? 'daemon-pid-changed' : 'stale-session-cleared'
      });
    }

    const previousSessionId = clearStaleBridgeSession(state, forceFreshSession) || state.lastSessionId;
    log(`Connecting bridge transport with sessionId=${previousSessionId || 'none'} (forceFreshSession=${forceFreshSession})`);
    await connectBridgeTransport(state, { sessionId: previousSessionId });
    try {
      log(`Replaying bridge session using trigger=${trigger}`);
      await replayBridgeSession(state, {
        forceFreshSession,
        trigger
      });
      log(`Bridge reconnected successfully${state.lastSessionId ? ` (session ${state.lastSessionId})` : ''}.`);
    } catch (error) {
      log(`Session replay failed with previous session ${previousSessionId || 'n/a'}: ${error.message}`);
      state.lastSessionId = null;
      log('Retrying with a fresh bridge session after replay failure.');
      await connectBridgeTransport(state, { sessionId: null });
      await replayBridgeSession(state, {
        forceFreshSession: true,
        trigger: `${trigger}: replay fallback`
      });
      log(`Bridge reconnected successfully${state.lastSessionId ? ` (session ${state.lastSessionId})` : ''}.`);
    }
  } catch (error) {
    log(`Reconnection failed: ${error.message}. Will retry instead of shutting down.`);
    setTimeout(() => {
      if (!state.isReconnecting) {
        void scheduleBridgeRecovery(state, `${trigger}: reconnect failed`, connectBridgeTransport, {
          ...options,
          backoffMs: Math.max(BRIDGE_RECOVERY_BACKOFF_MS * 4, 1000),
          forceFreshSession: true
        });
      }
    }, Math.max(BRIDGE_RECOVERY_BACKOFF_MS * 4, 1000));
  }
}

export async function sendBridgeInternalRequest(state, message, timeoutMs = 10000) {
  if (!state.httpTransport) {
    throw new Error(`Internal MCP request cannot be sent without an active HTTP transport: ${message.method}`);
  }

  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      state.internalRequests.delete(message.id);
      reject(new Error(`Internal MCP request timed out: ${message.method}`));
    }, timeoutMs);

    state.internalRequests.set(message.id, {
      resolve,
      reject,
      timeout
    });

    state.httpTransport.send(message)
      .then(() => {
        if (state.httpTransport?._sessionId) {
          state.lastSessionId = state.httpTransport._sessionId;
        }
      })
      .catch((error) => {
        clearTimeout(timeout);
        state.internalRequests.delete(message.id);
        reject(error);
      });
  });
}

function isRecoverableBridgeSendError(error) {
  const message = String(error?.message || error || '');
  return /Transport closed|SESSION_EXPIRED|session expired|Invalid session|session not found|invalid or missing MCP session|missing MCP session|Conflict|server rejected request after daemon restart|BRIDGE_FORWARD_FAILED|fetch failed|Failed to fetch|socket hang up|terminated/i.test(message);
}

async function verifyRecoveredBridgeSession(state, trigger = 'bridge recovery') {
  const verificationId = `bridge-verify-${Date.now()}`;
  const response = await sendBridgeInternalRequest(state, {
    jsonrpc: '2.0',
    id: verificationId,
    method: 'tools/list',
    params: {}
  }, 15000);

  if (response?.error) {
    throw new Error(response.error.message || `Recovered bridge session verification failed during ${trigger}.`);
  }

  state.persistBridgeSessionSnapshot?.({
    bridgeTransportState: 'session-verified'
  });
}

export async function ensureBridgeTransportReady(state, connectBridgeTransport, options = {}) {
  if (state.isReconnecting && state.reconnectPromise) {
    await state.reconnectPromise.catch(() => {});
  }

  const currentTransport = state.httpTransport;
  const currentSessionId = getCurrentBridgeSessionId(state);
  const transportUsable = Boolean(currentTransport) && !isBridgeTransportAborted(currentTransport);

  if (transportUsable && !options.forceFreshSession) {
    return state.httpTransport;
  }

  const sessionId = currentSessionId;
  const forceFreshSession = options.forceFreshSession === true || !sessionId;

  if (!transportUsable || forceFreshSession) {
    state.httpTransport = null;
    await connectBridgeTransport(state, { sessionId: forceFreshSession ? null : sessionId });
  }

  return state.httpTransport;
}

export async function sendBridgeMessageWithRecovery(state, message, connectBridgeTransport, options = {}) {
  await ensureBridgeTransportReady(state, connectBridgeTransport, options);

  try {
    await state.httpTransport.send(message);
    if (state.httpTransport?._sessionId) {
      state.lastSessionId = state.httpTransport._sessionId;
      state.persistBridgeSessionSnapshot?.({
        bridgeTransportState: 'internal-request-sent'
      });
    }
    return true;
  } catch (error) {
    if (!isRecoverableBridgeSendError(error)) {
      throw error;
    }

    const currentSessionId = getCurrentBridgeSessionId(state);
    const forceFreshSession = /SESSION_EXPIRED|session expired|Invalid session|session not found|invalid or missing MCP session|missing MCP session|Conflict|BRIDGE_FORWARD_FAILED|fetch failed|Failed to fetch|socket hang up|terminated/i.test(String(error?.message || error || ''));
    state.lastSessionId = forceFreshSession ? null : currentSessionId;
    const currentTransport = state.httpTransport;
    state.httpTransport = null;
    if (currentTransport) {
      currentTransport.close().catch(() => {});
    }

    await scheduleBridgeRecovery(
      state,
      options.trigger || 'bridge send recovery',
      connectBridgeTransport,
      {
        forceFreshSession,
        backoffMs: Number.isFinite(Number(options.backoffMs)) ? Number(options.backoffMs) : 0
      }
    );

    await ensureBridgeTransportReady(state, connectBridgeTransport, { forceFreshSession });
    await state.httpTransport.send(message);
    if (state.httpTransport?._sessionId) {
      state.lastSessionId = state.httpTransport._sessionId;
      state.persistBridgeSessionSnapshot?.({
        bridgeTransportState: 'recovered-message-sent'
      });
    }
    return true;
  }
}

export async function replayBridgeSession(state, options = {}) {
  if (!state.cachedInitializeRequest?.params) {
    log('No cached initialize request available. Bridge cannot auto-reinitialize this client session.');
    return;
  }

  const internalId = `bridge-reinit-${Date.now()}`;
  const forceFreshSession = options.forceFreshSession === true;
  const trigger = options.trigger || 'bridge recovery';
  const currentSessionId = state.lastSessionId || state.httpTransport?._sessionId || null;

  if (!forceFreshSession && currentSessionId) {
    log(`Existing MCP session ${currentSessionId} is already initialized. Skipping initialize replay.`);
    state.persistBridgeSessionSnapshot?.({
      bridgeTransportState: 'session-reused'
    });
    return;
  }

  const clientInfo = state.cachedInitializeRequest.params.clientInfo && typeof state.cachedInitializeRequest.params.clientInfo === 'object'
    ? { ...state.cachedInitializeRequest.params.clientInfo }
    : {};

  if (forceFreshSession) {
    clientInfo.force_fresh_session = true;
    clientInfo.bridge_recovery = true;
    clientInfo.bridge_recovery_trigger = trigger;
  }

  const initMessage = {
    ...state.cachedInitializeRequest,
    params: {
      ...state.cachedInitializeRequest.params,
      clientInfo
    },
    id: internalId
  };

  log(`Replaying cached initialize request to rebuild MCP session (forceFreshSession=${forceFreshSession}, trigger=${trigger})...`);
  await sendBridgeInternalRequest(state, initMessage, 15000);
  const replaySessionId = state.lastSessionId || state.httpTransport?._sessionId || await waitForBridgeSessionId(state, 10000);
  if (replaySessionId) {
    state.lastSessionId = replaySessionId;
  }
  log(`Initialize replay completed with session ${replaySessionId || 'none'}.`);
  state.persistBridgeSessionSnapshot?.({
    bridgeTransportState: 'initialize-replayed'
  });

  if (state.cachedInitializedNotification) {
    if (!replaySessionId) {
      log('Skipping initialized notification replay until the HTTP session is established.');
      return;
    }
    try {
      await state.httpTransport.send(state.cachedInitializedNotification);
      state.persistBridgeSessionSnapshot?.({
        bridgeTransportState: 'initialized-notification-replayed'
      });
    } catch (error) {
      log(`Failed to replay initialized notification: ${error.message}`);
    }
  }

  await verifyRecoveredBridgeSession(state, trigger);
}

export async function startBridgeRecovery(state, trigger, connectBridgeTransport, options = {}) {
  if (state.isReconnecting) {
    return state.reconnectPromise;
  }

  if (shouldSkipDuplicateRecovery(state, trigger, options)) {
    log(`Skipping duplicate recovery for trigger=${trigger}.`);
    return state.reconnectPromise || Promise.resolve();
  }

  state.isReconnecting = true;
  log(`Starting immediate bridge recovery for trigger=${trigger}.`);
  await failBridgePendingRequests(
    state,
    'DAEMON_RESTARTING: in-flight request was interrupted. Retry after bridge recovery.'
  );

  state.reconnectPromise = runBridgeRecovery(state, trigger, connectBridgeTransport, options);

  try {
    await state.reconnectPromise;
  } finally {
    state.isReconnecting = false;
    state.reconnectPromise = null;
  }
}

export async function scheduleBridgeRecovery(state, trigger, connectBridgeTransport, options = {}) {
  const backoffMs = Number.isFinite(Number(options.backoffMs))
    ? Math.max(0, Number(options.backoffMs))
    : BRIDGE_RECOVERY_BACKOFF_MS;
  const recoverFn = typeof options.recoverFn === 'function' ? options.recoverFn : runBridgeRecovery;
  const normalizedOptions = {
    ...options,
    forceFreshSession: shouldForceFreshSession(trigger, options)
  };

  if (state.isReconnecting) {
    return state.reconnectPromise;
  }

  if (shouldSkipDuplicateRecovery(state, trigger, normalizedOptions)) {
    log(`Skipping duplicate scheduled recovery for trigger=${trigger}.`);
    return state.reconnectPromise || Promise.resolve();
  }

  state.isReconnecting = true;
  log(`Scheduling bridge recovery for trigger=${trigger} in ${backoffMs}ms (forceFreshSession=${normalizedOptions.forceFreshSession === true}).`);
  state.reconnectPromise = (async () => {
    await failBridgePendingRequests(
      state,
      'DAEMON_RESTARTING: in-flight request was interrupted. Retry after bridge recovery.'
    );

    clearStaleBridgeSession(state, normalizedOptions.forceFreshSession);

    if (backoffMs > 0) {
      log(`Bridge recovery backoff started (${backoffMs}ms) for trigger=${trigger}.`);
      await waitMs(backoffMs);
    }

    return recoverFn(state, trigger, connectBridgeTransport, normalizedOptions);
  })();

  try {
    return await state.reconnectPromise;
  } finally {
    state.isReconnecting = false;
    state.reconnectPromise = null;
  }
}
