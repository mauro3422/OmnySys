import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Lifecycle Module', () => {
  let tempDir;
  let originalExit;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lifecycle-test-'));
    originalExit = process.exit;
    process.exit = () => {};
  });

  afterEach(async () => {
    process.exit = originalExit;
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('shutdown()', () => {
    it('should set isRunning to false', async () => {
      const mockServer = {
        isRunning: true,
        wsManager: null,
        batchProcessor: null,
        fileWatcher: null,
        worker: null,
        orchestratorServer: null,
        bridgeServer: null
      };
      
      const lifecycle = await import('#core/unified-server/lifecycle.js');
      await lifecycle.shutdown.call(mockServer);
      expect(mockServer.isRunning).toBe(false);
    });

    it('should handle missing wsManager gracefully', async () => {
      const mockServer = {
        isRunning: true,
        wsManager: null,
        batchProcessor: null,
        fileWatcher: null,
        worker: null,
        orchestratorServer: null,
        bridgeServer: null
      };
      
      const lifecycle = await import('#core/unified-server/lifecycle.js');
      await expect(lifecycle.shutdown.call(mockServer)).resolves.not.toThrow();
    });

    it('should handle missing batchProcessor gracefully', async () => {
      const mockServer = {
        isRunning: true,
        wsManager: null,
        batchProcessor: null,
        fileWatcher: null,
        worker: null,
        orchestratorServer: null,
        bridgeServer: null
      };
      
      const lifecycle = await import('#core/unified-server/lifecycle.js');
      await expect(lifecycle.shutdown.call(mockServer)).resolves.not.toThrow();
    });

    it('should handle missing fileWatcher gracefully', async () => {
      const mockServer = {
        isRunning: true,
        wsManager: null,
        batchProcessor: null,
        fileWatcher: null,
        worker: null,
        orchestratorServer: null,
        bridgeServer: null
      };
      
      const lifecycle = await import('#core/unified-server/lifecycle.js');
      await expect(lifecycle.shutdown.call(mockServer)).resolves.not.toThrow();
    });

    it('should handle missing worker gracefully', async () => {
      const mockServer = {
        isRunning: true,
        wsManager: null,
        batchProcessor: null,
        fileWatcher: null,
        worker: null,
        orchestratorServer: null,
        bridgeServer: null
      };
      
      const lifecycle = await import('#core/unified-server/lifecycle.js');
      await expect(lifecycle.shutdown.call(mockServer)).resolves.not.toThrow();
    });

    it('should handle missing orchestratorServer gracefully', async () => {
      const mockServer = {
        isRunning: true,
        wsManager: null,
        batchProcessor: null,
        fileWatcher: null,
        worker: null,
        orchestratorServer: null,
        bridgeServer: null
      };
      
      const lifecycle = await import('#core/unified-server/lifecycle.js');
      await expect(lifecycle.shutdown.call(mockServer)).resolves.not.toThrow();
    });

    it('should handle missing bridgeServer gracefully', async () => {
      const mockServer = {
        isRunning: true,
        wsManager: null,
        batchProcessor: null,
        fileWatcher: null,
        worker: null,
        orchestratorServer: null,
        bridgeServer: null
      };
      
      const lifecycle = await import('#core/unified-server/lifecycle.js');
      await expect(lifecycle.shutdown.call(mockServer)).resolves.not.toThrow();
    });

    it('should handle all null components gracefully', async () => {
      const nullServer = {
        isRunning: true,
        wsManager: null,
        batchProcessor: null,
        fileWatcher: null,
        worker: null,
        orchestratorServer: null,
        bridgeServer: null
      };
      
      const lifecycle = await import('#core/unified-server/lifecycle.js');
      await expect(lifecycle.shutdown.call(nullServer)).resolves.not.toThrow();
      expect(nullServer.isRunning).toBe(false);
    });

    it('should handle all undefined components gracefully', async () => {
      const undefinedServer = {
        isRunning: true,
        wsManager: undefined,
        batchProcessor: undefined,
        fileWatcher: undefined,
        worker: undefined,
        orchestratorServer: undefined,
        bridgeServer: undefined
      };
      
      const lifecycle = await import('#core/unified-server/lifecycle.js');
      await expect(lifecycle.shutdown.call(undefinedServer)).resolves.not.toThrow();
      expect(undefinedServer.isRunning).toBe(false);
    });
  });
});

describe('Shutdown Component Calls', () => {
  let tempDir;
  let originalExit;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shutdown-test-'));
    originalExit = process.exit;
    process.exit = () => {};
  });

  afterEach(async () => {
    process.exit = originalExit;
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('should call wsManager.stop when present', async () => {
    let wsManagerStopped = false;
    const server = {
      isRunning: true,
      wsManager: { stop: async () => { wsManagerStopped = true; } },
      batchProcessor: null,
      fileWatcher: null,
      worker: null,
      orchestratorServer: null,
      bridgeServer: null
    };

    const lifecycle = await import('#core/unified-server/lifecycle.js');
    await lifecycle.shutdown.call(server);
    expect(wsManagerStopped).toBe(true);
  });

  it('should call batchProcessor.stop when present', async () => {
    let batchProcessorStopped = false;
    const server = {
      isRunning: true,
      wsManager: null,
      batchProcessor: { stop: () => { batchProcessorStopped = true; } },
      fileWatcher: null,
      worker: null,
      orchestratorServer: null,
      bridgeServer: null
    };

    const lifecycle = await import('#core/unified-server/lifecycle.js');
    await lifecycle.shutdown.call(server);
    expect(batchProcessorStopped).toBe(true);
  });

  it('should call fileWatcher.stop when present', async () => {
    let fileWatcherStopped = false;
    const server = {
      isRunning: true,
      wsManager: null,
      batchProcessor: null,
      fileWatcher: { stop: async () => { fileWatcherStopped = true; } },
      worker: null,
      orchestratorServer: null,
      bridgeServer: null
    };

    const lifecycle = await import('#core/unified-server/lifecycle.js');
    await lifecycle.shutdown.call(server);
    expect(fileWatcherStopped).toBe(true);
  });

  it('should call worker.stop when present', async () => {
    let workerStopped = false;
    const server = {
      isRunning: true,
      wsManager: null,
      batchProcessor: null,
      fileWatcher: null,
      worker: { stop: async () => { workerStopped = true; } },
      orchestratorServer: null,
      bridgeServer: null
    };

    const lifecycle = await import('#core/unified-server/lifecycle.js');
    await lifecycle.shutdown.call(server);
    expect(workerStopped).toBe(true);
  });

  it('should call orchestratorServer.close when present', async () => {
    let orchestratorClosed = false;
    const server = {
      isRunning: true,
      wsManager: null,
      batchProcessor: null,
      fileWatcher: null,
      worker: null,
      orchestratorServer: { close: () => { orchestratorClosed = true; } },
      bridgeServer: null
    };

    const lifecycle = await import('#core/unified-server/lifecycle.js');
    await lifecycle.shutdown.call(server);
    expect(orchestratorClosed).toBe(true);
  });

  it('should call bridgeServer.close when present', async () => {
    let bridgeClosed = false;
    const server = {
      isRunning: true,
      wsManager: null,
      batchProcessor: null,
      fileWatcher: null,
      worker: null,
      orchestratorServer: null,
      bridgeServer: { close: () => { bridgeClosed = true; } }
    };

    const lifecycle = await import('#core/unified-server/lifecycle.js');
    await lifecycle.shutdown.call(server);
    expect(bridgeClosed).toBe(true);
  });

  it('should stop all components in correct order', async () => {
    const stopOrder = [];
    const server = {
      isRunning: true,
      wsManager: { stop: async () => stopOrder.push('wsManager') },
      batchProcessor: { stop: () => stopOrder.push('batchProcessor') },
      fileWatcher: { stop: async () => stopOrder.push('fileWatcher') },
      worker: { stop: async () => stopOrder.push('worker') },
      orchestratorServer: { close: () => stopOrder.push('orchestratorServer') },
      bridgeServer: { close: () => stopOrder.push('bridgeServer') }
    };

    const lifecycle = await import('#core/unified-server/lifecycle.js');
    await lifecycle.shutdown.call(server);
    
    expect(stopOrder).toEqual([
      'wsManager',
      'batchProcessor',
      'fileWatcher',
      'worker',
      'orchestratorServer',
      'bridgeServer'
    ]);
  });
});

describe('ServerState Transitions', () => {
  let ServerStateBuilder;

  beforeEach(async () => {
    const factory = await import('#test-factories/core-unified-server');
    ServerStateBuilder = factory.ServerStateBuilder;
  });

  it('should transition from initializing to running', () => {
    const state = ServerStateBuilder.create()
      .asInitializing()
      .asRunning()
      .build();
    
    expect(state.status).toBe('running');
    expect(state.isRunning).toBe(true);
  });

  it('should transition from running to stopped', () => {
    const state = ServerStateBuilder.create()
      .asRunning()
      .asStopped()
      .build();
    
    expect(state.status).toBe('stopped');
    expect(state.isRunning).toBe(false);
  });

  it('should track uptime', () => {
    const uptime = 5000;
    const state = ServerStateBuilder.create()
      .asRunning()
      .withUptime(uptime)
      .build();
    
    expect(state.uptime).toBe(uptime);
  });
});
