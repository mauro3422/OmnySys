import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  failBridgePendingRequests: vi.fn(async () => undefined),
  sendBridgeRetryableError: vi.fn(async () => undefined),
  waitForDaemonHealthy: vi.fn(async () => ({ healthy: true })),
  log: vi.fn()
}));

vi.mock('../../../../src/layer-c-memory/mcp/stdio-bridge-lifecycle.js', () => ({
  failBridgePendingRequests: mocks.failBridgePendingRequests,
  sendBridgeRetryableError: mocks.sendBridgeRetryableError,
  waitForDaemonHealthy: mocks.waitForDaemonHealthy,
  log: mocks.log
}));

import {
  replayBridgeSession,
  scheduleBridgeRecovery
} from '../../../../src/layer-c-memory/mcp/stdio-bridge-recovery.js';

describe('replayBridgeSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks recovered initialize requests as fresh session recoveries', async () => {
    const state = {
      internalRequests: new Map(),
      cachedInitializeRequest: {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'Codex',
            client_id: 'codex'
          }
        },
        id: 1
      },
      cachedInitializedNotification: null,
      httpTransport: {
        send: vi.fn(async (message) => {
          const pending = state.internalRequests.get(message.id);
          if (pending) {
            pending.resolve({ id: message.id });
          }
          return undefined;
        })
      }
    };

    await replayBridgeSession(state, {
      forceFreshSession: true,
      trigger: 'transport closed'
    });

    expect(state.httpTransport.send).toHaveBeenCalledTimes(1);
    expect(state.httpTransport.send).toHaveBeenCalledWith(expect.objectContaining({
      method: 'initialize',
      params: expect.objectContaining({
        clientInfo: expect.objectContaining({
          name: 'Codex',
          client_id: 'codex',
          force_fresh_session: true,
          bridge_recovery: true,
          bridge_recovery_trigger: 'transport closed'
        })
      })
    }));
  });
});

describe('scheduleBridgeRecovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits before delegating to bridge recovery', async () => {
    const state = {
      isReconnecting: false,
      reconnectPromise: null,
      pendingRequests: new Map(),
      stdioTransport: { send: vi.fn() }
    };
    const recoverFn = vi.fn(async () => 'recovered');
    const connectBridgeTransport = vi.fn();

    const promise = scheduleBridgeRecovery(state, 'session rejected', connectBridgeTransport, {
      backoffMs: 100,
      recoverFn
    });

    expect(recoverFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(99);
    expect(recoverFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe('recovered');
    expect(recoverFn).toHaveBeenCalledWith(
      state,
      'session rejected',
      connectBridgeTransport,
      expect.objectContaining({
        backoffMs: 100,
        forceFreshSession: false
      })
    );
  });

  it('skips recovery when a reconnect is already in progress', async () => {
    const state = {
      isReconnecting: true,
      reconnectPromise: Promise.resolve('pending'),
      pendingRequests: new Map(),
      stdioTransport: { send: vi.fn() }
    };
    const recoverFn = vi.fn();
    const connectBridgeTransport = vi.fn();

    await expect(scheduleBridgeRecovery(state, 'session rejected', connectBridgeTransport, {
      backoffMs: 100,
      recoverFn
    })).resolves.toBe('pending');

    expect(recoverFn).not.toHaveBeenCalled();
  });

  it('forces a fresh bridge session after a transport close', async () => {
    const state = {
      isReconnecting: false,
      reconnectPromise: null,
      pendingRequests: new Map(),
      stdioTransport: { send: vi.fn() },
      lastSessionId: 'session-old'
    };
    const recoverFn = vi.fn(async (bridgeState, trigger, connectBridgeTransport, options) => {
      expect(trigger).toBe('transport closed');
      expect(options.forceFreshSession).toBe(true);
      expect(connectBridgeTransport).toBeInstanceOf(Function);
      return 'recovered';
    });
    const connectBridgeTransport = vi.fn();

    await expect(scheduleBridgeRecovery(state, 'transport closed', connectBridgeTransport, {
      backoffMs: 0,
      recoverFn
    })).resolves.toBe('recovered');

    expect(recoverFn).toHaveBeenCalledTimes(1);
    expect(state.lastSessionId).toBe(null);
  });

  it('skips duplicate recovery attempts for the same trigger window', async () => {
    const state = {
      isReconnecting: false,
      reconnectPromise: null,
      pendingRequests: new Map(),
      stdioTransport: { send: vi.fn() },
      lastSessionId: 'session-old',
      lastRecoverySignature: 'transport closed::fresh',
      lastRecoveryAt: Date.now()
    };
    const recoverFn = vi.fn(async () => 'recovered');
    const connectBridgeTransport = vi.fn();

    await expect(scheduleBridgeRecovery(state, 'transport closed', connectBridgeTransport, {
      backoffMs: 0,
      recoverFn,
      forceFreshSession: true
    })).resolves.toBeUndefined();

    expect(recoverFn).not.toHaveBeenCalled();
    expect(connectBridgeTransport).not.toHaveBeenCalled();
  });
});
