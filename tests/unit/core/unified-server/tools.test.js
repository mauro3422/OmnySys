import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Tools - Status Tools', () => {
  let tempDir;
  let mockServer;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tools-test-'));
    
    mockServer = {
      projectPath: tempDir,
      cache: {
        ramCacheGet: () => null,
        set: () => {},
        getCacheStats: () => ({ ram: { entries: 0 }, disk: { entries: 0 } }),
        invalidate: () => {},
        clear: () => {}
      },
      metadata: null,
      initialized: false,
      startTime: Date.now(),
      isRunning: true,
      currentJob: null,
      queue: {
        getAll: () => ({ critical: [], high: [], medium: [], low: [] })
      },
      stats: {
        totalAnalyzed: 0,
        totalQueued: 0,
        avgTime: 0,
        cacheHitRate: 0
      },
      ports: { orchestrator: 9999, bridge: 9998 },
      shutdown: async () => { mockServer.isRunning = false; }
    };
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('getFullStatus', () => {
    it('should return server status structure', async () => {
      const { getFullStatus } = await import('#core/unified-server/tools/status-tools.js');
      const result = await getFullStatus.call(mockServer);
      
      expect(result).toHaveProperty('server');
      expect(result).toHaveProperty('orchestrator');
      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('cache');
    });

    it('should include server version', async () => {
      const { getFullStatus } = await import('#core/unified-server/tools/status-tools.js');
      const result = await getFullStatus.call(mockServer);
      
      expect(result.server).toHaveProperty('version');
      expect(result.server.version).toBe('2.0.0');
    });

    it('should include uptime calculation', async () => {
      const { getFullStatus } = await import('#core/unified-server/tools/status-tools.js');
      mockServer.startTime = Date.now() - 5000;
      const result = await getFullStatus.call(mockServer);
      
      expect(result.server.uptime).toBeGreaterThanOrEqual(5);
    });

    it('should include initialized state', async () => {
      const { getFullStatus } = await import('#core/unified-server/tools/status-tools.js');
      const result = await getFullStatus.call(mockServer);
      
      expect(result.server).toHaveProperty('initialized');
      expect(result.server.initialized).toBe(false);
    });

    it('should include ports', async () => {
      const { getFullStatus } = await import('#core/unified-server/tools/status-tools.js');
      const result = await getFullStatus.call(mockServer);
      
      expect(result.server.ports).toEqual({ orchestrator: 9999, bridge: 9998 });
    });

    it('should include orchestrator status', async () => {
      const { getFullStatus } = await import('#core/unified-server/tools/status-tools.js');
      const result = await getFullStatus.call(mockServer);
      
      expect(result.orchestrator).toHaveProperty('status');
      expect(result.orchestrator).toHaveProperty('currentJob');
      expect(result.orchestrator).toHaveProperty('queue');
      expect(result.orchestrator).toHaveProperty('stats');
    });

    it('should show running status when isRunning is true', async () => {
      const { getFullStatus } = await import('#core/unified-server/tools/status-tools.js');
      mockServer.isRunning = true;
      const result = await getFullStatus.call(mockServer);
      
      expect(result.orchestrator.status).toBe('running');
    });

    it('should show paused status when isRunning is false', async () => {
      const { getFullStatus } = await import('#core/unified-server/tools/status-tools.js');
      mockServer.isRunning = false;
      const result = await getFullStatus.call(mockServer);
      
      expect(result.orchestrator.status).toBe('paused');
    });

    it('should include project path', async () => {
      const { getFullStatus } = await import('#core/unified-server/tools/status-tools.js');
      const result = await getFullStatus.call(mockServer);
      
      expect(result.project.path).toBe(tempDir);
    });

    it('should include cache stats', async () => {
      const { getFullStatus } = await import('#core/unified-server/tools/status-tools.js');
      const result = await getFullStatus.call(mockServer);
      
      expect(result.cache).toEqual({ ram: { entries: 0 }, disk: { entries: 0 } });
    });
  });
});

describe('Tools - Server Tools', () => {
  let tempDir;
  let mockServer;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'server-tools-test-'));
    
    mockServer = {
      projectPath: tempDir,
      cache: {
        ramCacheGet: () => null,
        set: () => {},
        getCacheStats: () => ({ ram: { entries: 5 }, disk: { entries: 10 } }),
        getRamStats: () => ({ entries: 5 }),
        invalidate: () => {},
        clear: () => {}
      },
      shutdown: async () => { mockServer.isRunning = false; }
    };
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('clearAnalysisCache', () => {
    it('should return error when cache not initialized', async () => {
      const { clearAnalysisCache } = await import('#core/unified-server/tools/server-tools.js');
      const noCacheServer = { ...mockServer, cache: null };
      const result = await clearAnalysisCache.call(noCacheServer);
      
      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Cache not initialized');
    });

    it('should clear cache when initialized', async () => {
      const { clearAnalysisCache } = await import('#core/unified-server/tools/server-tools.js');
      const result = await clearAnalysisCache.call(mockServer);
      
      expect(result).toHaveProperty('cleared');
      expect(result.cleared).toBe(true);
    });

    it('should include before and after stats', async () => {
      const { clearAnalysisCache } = await import('#core/unified-server/tools/server-tools.js');
      const result = await clearAnalysisCache.call(mockServer);
      
      expect(result).toHaveProperty('before');
      expect(result).toHaveProperty('after');
    });

    it('should include success message', async () => {
      const { clearAnalysisCache } = await import('#core/unified-server/tools/server-tools.js');
      const result = await clearAnalysisCache.call(mockServer);
      
      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Analysis cache cleared successfully');
    });
  });

  describe('restartServer', () => {
    let originalExit;
    
    beforeEach(() => {
      originalExit = process.exit;
      process.exit = () => {};
    });

    afterEach(() => {
      process.exit = originalExit;
    });

    it('should return restart result', async () => {
      const { restartServer } = await import('#core/unified-server/tools/server-tools.js');
      const result = await restartServer.call(mockServer);
      
      expect(result).toHaveProperty('restarting');
      expect(result.restarting).toBe(true);
    });

    it('should include timestamp', async () => {
      const { restartServer } = await import('#core/unified-server/tools/server-tools.js');
      const result = await restartServer.call(mockServer);
      
      expect(result).toHaveProperty('timestamp');
    });

    it('should accept clearCache option', async () => {
      const { restartServer } = await import('#core/unified-server/tools/server-tools.js');
      const result = await restartServer.call(mockServer, true);
      
      expect(result.clearCache).toBe(true);
    });

    it('should default clearCache to false', async () => {
      const { restartServer } = await import('#core/unified-server/tools/server-tools.js');
      const result = await restartServer.call(mockServer);
      
      expect(result.clearCache).toBe(false);
    });
  });
});

describe('Tools - Function Signatures', () => {
  describe('Status Tools', () => {
    let statusTools;

    beforeEach(async () => {
      statusTools = await import('#core/unified-server/tools/status-tools.js');
    });

    it('getFullStatus should be async function', () => {
      expect(statusTools.getFullStatus.constructor.name).toBe('AsyncFunction');
    });

    it('getFilesStatus should be async function', () => {
      expect(statusTools.getFilesStatus.constructor.name).toBe('AsyncFunction');
    });

    it('getFileTool should be async function', () => {
      expect(statusTools.getFileTool.constructor.name).toBe('AsyncFunction');
    });

    it('getFileTool should accept filePath parameter', () => {
      expect(statusTools.getFileTool.length).toBe(1);
    });
  });

  describe('Server Tools', () => {
    let serverTools;

    beforeEach(async () => {
      serverTools = await import('#core/unified-server/tools/server-tools.js');
    });

    it('restartServer should be async function', () => {
      expect(serverTools.restartServer.constructor.name).toBe('AsyncFunction');
    });

    it('clearAnalysisCache should be async function', () => {
      expect(serverTools.clearAnalysisCache.constructor.name).toBe('AsyncFunction');
    });

    it('restartServer should accept optional clearCache parameter', () => {
      expect(serverTools.restartServer.length).toBe(0);
    });
  });
});

describe('ServerStateBuilder Usage', () => {
  let ServerStateBuilder;

  beforeEach(async () => {
    const factory = await import('#test-factories/core-unified-server');
    ServerStateBuilder = factory.ServerStateBuilder;
  });

  it('should build running server state', () => {
    const state = ServerStateBuilder.create()
      .asRunning()
      .build();
    
    expect(state.isRunning).toBe(true);
    expect(state.status).toBe('running');
    expect(state.startTime).toBeDefined();
  });

  it('should build stopped server state', () => {
    const state = ServerStateBuilder.create()
      .asStopped()
      .build();
    
    expect(state.isRunning).toBe(false);
    expect(state.status).toBe('stopped');
    expect(state.startTime).toBeNull();
  });

  it('should build initializing server state', () => {
    const state = ServerStateBuilder.create()
      .asInitializing()
      .build();
    
    expect(state.isRunning).toBe(false);
    expect(state.status).toBe('initializing');
  });

  it('should include stats in state', () => {
    const state = ServerStateBuilder.create().build();
    
    expect(state.stats).toHaveProperty('totalAnalyzed');
    expect(state.stats).toHaveProperty('totalQueued');
    expect(state.stats).toHaveProperty('avgTime');
    expect(state.stats).toHaveProperty('cacheHitRate');
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
