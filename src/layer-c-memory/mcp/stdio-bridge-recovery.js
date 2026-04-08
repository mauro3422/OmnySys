/**
 * Recovery helpers for the MCP stdio bridge.
 */

import {
  failBridgePendingRequests,
  log,
  sendBridgeRetryableError
} from './stdio-bridge-lifecycle.js';
import { waitForDaemonHealthy } from './stdio-bridge-health.js';

const DAEMON_HEALTH = process.env.OMNYSYS_HEALTH_URL || 'http://127.0.0.1:9999/health';
const DAEMON_RECOVERY_TIMEOUT_MS = Number(process.env.OMNYSYS_DAEMON_RECOVERY_TIMEOUT_MS || 180000);
const DAEMON_RECOVERY_POLL_MS = Number(process.env.OMNYSYS_DAEMON_RECOVERY_POLL_MS || 1500);
const BRIDGE_RECOVERY_BACKOFF_MS = Number(process.env.OMNYSYS_BRIDGE_RECOVERY_BACKOFF_MS || 250);
const BRIDGE_RECOVERY_DUPLICATE_WINDOW_MS = Number(process.env.OMNYSYS_BRIDGE_RECOVERY_DUPLICATE_WINDOW_MS || 1500);

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldForceFreshSession(trigger, options = {}) {
  if (options.forceFreshSession === true) {
    return true;
  }

  return /transport closed|server rejected request after daemon restart|SESSION_EXPIRED|session expired|Invalid session|session not found|Conflict/i.test(trigger);
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

async function runBridgeRecovery(state, trigger, connectBridgeTransport, options = {}) {
  log(`Starting bridge recovery (${trigger})...`);

  const health = await waitForDaemonHealthy(DAEMON_HEALTH, {
    timeoutMs: DAEMON_RECOVERY_TIMEOUT_MS,
    pollMs: DAEMON_RECOVERY_POLL_MS,
    label: 'daemon recovery'
  });

  if (!health?.healthy) {
    log('Daemon recovery failed. Shutting down bridge.');
    state.stdioTransport.close().catch(() => {});
    process.exit(1);
  }

  log('Daemon recovered. Reconnecting HTTP transport...');
  try {
    const forceFreshSession = shouldForceFreshSession(trigger, options);
    const previousSessionId = clearStaleBridgeSession(state, forceFreshSession) || state.lastSessionId;
    await connectBridgeTransport(state, { sessionId: previousSessionId });
    try {
      await replayBridgeSession(state, {
        forceFreshSession,
        trigger
      });
      log(`Bridge reconnected successfully${state.lastSessionId ? ` (session ${state.lastSessionId})` : ''}.`);
    } catch (error) {
      log(`Session replay failed with previous session ${previousSessionId || 'n/a'}: ${error.message}`);
      state.lastSessionId = null;
      await connectBridgeTransport(state, { sessionId: null });
      await replayBridgeSession(state, {
        forceFreshSession: true,
        trigger: `${trigger}: replay fallback`
      });
      log(`Bridge reconnected successfully${state.lastSessionId ? ` (session ${state.lastSessionId})` : ''}.`);
    }
  } catch (error) {
    log(`Reconnection failed: ${error.message}`);
    process.exit(1);
  }
}

export async function sendBridgeInternalRequest(state, message, timeoutMs = 10000) {
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

export async function replayBridgeSession(state, options = {}) {
  if (!state.cachedInitializeRequest?.params) {
    log('No cached initialize request available. Bridge cannot auto-reinitialize this client session.');
    return;
  }

  const internalId = `bridge-reinit-${Date.now()}`;
  const forceFreshSession = options.forceFreshSession === true;
  const trigger = options.trigger || 'bridge recovery';
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

  log('Replaying cached initialize request to rebuild MCP session...');
  await sendBridgeInternalRequest(state, initMessage, 15000);

  if (state.cachedInitializedNotification) {
    try {
      await state.httpTransport.send(state.cachedInitializedNotification);
    } catch (error) {
      log(`Failed to replay initialized notification: ${error.message}`);
    }
  }
}

export async function startBridgeRecovery(state, trigger, connectBridgeTransport, options = {}) {
  if (state.isReconnecting) {
    return state.reconnectPromise;
  }

  if (shouldSkipDuplicateRecovery(state, trigger, options)) {
    return state.reconnectPromise || Promise.resolve();
  }

  state.isReconnecting = true;
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
    return state.reconnectPromise || Promise.resolve();
  }

  state.isReconnecting = true;
  state.reconnectPromise = (async () => {
    await failBridgePendingRequests(
      state,
      'DAEMON_RESTARTING: in-flight request was interrupted. Retry after bridge recovery.'
    );

    clearStaleBridgeSession(state, normalizedOptions.forceFreshSession);

    if (backoffMs > 0) {
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
