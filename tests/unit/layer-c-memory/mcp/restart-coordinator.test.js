import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { clearPendingRuntimeRestart, queueRuntimeRestart } from '../../../../src/layer-c-memory/mcp/core/hot-reload-manager/restart-coordinator.js';

describe('restart coordinator', () => {
  const originalEnv = process.env.OMNYSYS_PROXY_MODE;
  const originalSend = process.send;

  beforeEach(() => {
    clearPendingRuntimeRestart(createServerStub());
    vi.useRealTimers();
    process.env.OMNYSYS_PROXY_MODE = originalEnv;
    process.send = originalSend;
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.OMNYSYS_PROXY_MODE = originalEnv;
    process.send = originalSend;
  });

  it('queues manual restarts when proxy auto mode is unavailable', () => {
    const server = createServerStub({ runtimeRestartMode: 'manual' });

    const result = queueRuntimeRestart(server, {
      filename: 'src/core/example.js',
      reason: 'Runtime module'
    });

    expect(result).toBe(false);
    expect(server._pendingHotReloadRestartFiles.has('src/core/example.js')).toBe(true);
    expect(server.emit).toHaveBeenCalledWith(
      'hot-reload:restart-pending',
      expect.objectContaining({
        file: 'src/core/example.js',
        reason: 'manual_runtime_restart_required'
      })
    );
  });

  it('schedules a proxy-managed restart in auto mode', async () => {
    vi.useFakeTimers();
    process.env.OMNYSYS_PROXY_MODE = '1';
    process.send = vi.fn();

    const server = createServerStub({ runtimeRestartMode: 'auto' });

    const result = queueRuntimeRestart(server, {
      filename: 'src/core/example.js',
      reason: 'Runtime module'
    });

    expect(result).toBe(true);
    expect(server._hotReloadRestartScheduled).toBe(true);
    expect(server.emit).toHaveBeenCalledWith(
      'hot-reload:restart-pending',
      expect.objectContaining({
        file: 'src/core/example.js',
        reason: 'proxy_managed_runtime_restart_scheduled'
      })
    );

    await vi.runAllTimersAsync();

    expect(process.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'restart',
        reason: 'hot_reload_runtime_change',
        file: 'src/core/example.js'
      })
    );
  });
});

function createServerStub(overrides = {}) {
  return {
    runtimeRestartMode: 'manual',
    _pendingHotReloadRestartFiles: new Set(),
    _hotReloadRestartScheduled: false,
    _hotReloadRestartTimer: null,
    emit: vi.fn(),
    ...overrides
  };
}

