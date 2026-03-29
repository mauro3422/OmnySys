import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { clearPendingRuntimeRestart, queueRuntimeRestart } from '../../../../src/layer-c-memory/mcp/core/hot-reload-manager/restart-coordinator.js';

describe('restart coordinator', () => {
  // Keep the manual path free of env stubbing; the proxy-only case lives in the split spec.
  beforeEach(() => {
    clearPendingRuntimeRestart({
      runtimeRestartMode: 'manual',
      _pendingHotReloadRestartFiles: new Set(),
      _hotReloadRestartScheduled: false,
      _hotReloadRestartTimer: null
    });
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues manual restarts when proxy auto mode is unavailable', () => {
    const server = {
      runtimeRestartMode: 'manual',
      _pendingHotReloadRestartFiles: new Set(),
      _hotReloadRestartScheduled: false,
      _hotReloadRestartTimer: null,
      emit: vi.fn()
    };

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

  it('does not crash when the server cannot emit hot-reload events', () => {
    const server = {
      runtimeRestartMode: 'manual',
      _pendingHotReloadRestartFiles: new Set(),
      _hotReloadRestartScheduled: false,
      _hotReloadRestartTimer: null
    };

    expect(() => queueRuntimeRestart(server, {
      filename: 'src/core/example.js',
      reason: 'Runtime module'
    })).not.toThrow();

    expect(server._pendingHotReloadRestartFiles.has('src/core/example.js')).toBe(true);
  });
});
