/**
 * Recovery helpers for the MCP stdio bridge.
 */

import {
  failBridgePendingRequests,
  log,
  sendBridgeRetryableError,
  waitForDaemonHealthy
} from './stdio-bridge-lifecycle.js';

const DAEMON_RECOVERY_TIMEOUT_MS = Number(process.env.OMNYSYS_DAEMON_RECOVERY_TIMEOUT_MS || 180000);
const DAEMON_RECOVERY_POLL_MS = Number(process.env.OMNYSYS_DAEMON_RECOVERY_POLL_MS || 1500);
const BRIDGE_RECOVERY_BACKOFF_MS = Number(process.env.OMNYSYS_BRIDGE_RECOVERY_BACKOFF_MS || 250);

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBridgeRecovery(state, trigger, connectBridgeTransport) {
  log(`Starting bridge recovery (${trigger})...`);

  const health = await waitForDaemonHealthy({
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
    const previousSessionId = state.lastSessionId;
    await connectBridgeTransport(state, { sessionId: previousSessionId });
    try {
      await replayBridgeSession(state);
      log(`Bridge reconnected successfully${state.lastSessionId ? ` (session ${state.lastSessionId})` : ''}.`);
    } catch (error) {
      log(`Session replay failed with previous session ${previousSessionId || 'n/a'}: ${error.message}`);
      state.lastSessionId = null;
      await connectBridgeTransport(state, { sessionId: null });
      await replayBridgeSession(state);
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

export async function replayBridgeSession(state) {
  if (!state.cachedInitializeRequest?.params) {
    log('No cached initialize request available. Bridge cannot auto-reinitialize this client session.');
    return;
  }

  const internalId = `bridge-reinit-${Date.now()}`;
  const initMessage = {
    ...state.cachedInitializeRequest,
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

export async function startBridgeRecovery(state, trigger, connectBridgeTransport) {
  if (state.isReconnecting) {
    return state.reconnectPromise;
  }

  state.isReconnecting = true;
  await failBridgePendingRequests(
    state,
    'DAEMON_RESTARTING: in-flight request was interrupted. Retry after bridge recovery.'
  );

  state.reconnectPromise = runBridgeRecovery(state, trigger, connectBridgeTransport);

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

  if (state.isReconnecting) {
    return state.reconnectPromise;
  }

  state.isReconnecting = true;
  state.reconnectPromise = (async () => {
    await failBridgePendingRequests(
      state,
      'DAEMON_RESTARTING: in-flight request was interrupted. Retry after bridge recovery.'
    );

    if (backoffMs > 0) {
      await waitMs(backoffMs);
    }

    return recoverFn(state, trigger, connectBridgeTransport);
  })();

  try {
    return await state.reconnectPromise;
  } finally {
    state.isReconnecting = false;
    state.reconnectPromise = null;
  }
}
