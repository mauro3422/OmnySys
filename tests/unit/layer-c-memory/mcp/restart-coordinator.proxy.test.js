import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queueRuntimeRestart } from '../../../../src/layer-c-memory/mcp/core/hot-reload-manager/restart-coordinator.js';

describe('restart coordinator proxy mode', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules a proxy-managed restart in auto mode', async () => {
    vi.useFakeTimers();

    const originalSend = process.send;
    process.send = vi.fn();

    const server = {
      runtimeRestartMode: 'auto',
      proxyManaged: true,
      _pendingHotReloadRestartFiles: new Set(),
      _hotReloadRestartScheduled: false,
      _hotReloadRestartTimer: null,
      emit: vi.fn()
    };

    try {
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
    } finally {
      process.send = originalSend;
    }
  });
});
