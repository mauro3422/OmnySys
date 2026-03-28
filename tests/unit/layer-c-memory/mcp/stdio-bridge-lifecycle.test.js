import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scheduleBridgeRecovery } from '../../../../src/layer-c-memory/mcp/stdio-bridge-recovery.js';

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
    expect(recoverFn).toHaveBeenCalledWith(state, 'session rejected', connectBridgeTransport);
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
});
