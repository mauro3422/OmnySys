import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIRequestBuilder, APIResponseBuilder } from '#test-factories/core-unified-server';

function createMockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    write: vi.fn().mockReturnThis()
  };
  return res;
}

function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    on: vi.fn(),
    ...overrides
  };
}

async function createOrchestratorRouteHandlers(server) {
  const routes = { get: {}, post: {} };
  
  const mockApp = {
    use: vi.fn(),
    get: vi.fn((path, handler) => { routes.get[path] = handler; }),
    post: vi.fn((path, handler) => { routes.post[path] = handler; })
  };
  
  server.orchestratorApp = mockApp;
  
  const apiModule = await import('#core/unified-server/api.js');
  apiModule.setupOrchestratorAPI.call(server);
  
  return routes;
}

async function createBridgeRouteHandlers(server) {
  const routes = { get: {}, post: {} };
  
  const mockApp = {
    use: vi.fn(),
    get: vi.fn((path, handler) => { routes.get[path] = handler; }),
    post: vi.fn((path, handler) => { routes.post[path] = handler; })
  };
  
  server.bridgeApp = mockApp;
  server.setupWebSocket = vi.fn();
  
  const apiModule = await import('#core/unified-server/api.js');
  apiModule.setupBridgeAPI.call(server);
  
  return routes;
}

describe('Orchestrator API', () => {
  let mockServer;
  let routes;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockServer = {
      queue: {
        size: vi.fn().mockReturnValue(5),
        getAll: vi.fn().mockReturnValue([])
      },
      currentJob: null,
      isRunning: true,
      initialized: true,
      stats: {
        totalAnalyzed: 10,
        totalQueued: 5,
        avgTime: 150,
        cacheHitRate: 0.8
      },
      worker: {
        isHealthy: vi.fn().mockReturnValue(true)
      },
      handlePrioritize: vi.fn().mockResolvedValue({ status: 'queued', position: 1 }),
      restart: vi.fn().mockResolvedValue(true)
    };
    
    routes = await createOrchestratorRouteHandlers(mockServer);
  });

  describe('POST /command', () => {
    it('should return 400 when filePath is missing', async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();
      
      await routes.post['/command'](req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'filePath required' });
    });

    it('should handle prioritize with valid filePath', async () => {
      const req = createMockRequest({ body: { filePath: '/src/test.js' } });
      const res = createMockResponse();
      
      await routes.post['/command'](req, res);
      
      expect(mockServer.handlePrioritize).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('should use default priority when not specified', async () => {
      const req = createMockRequest({ body: { filePath: '/src/test.js' } });
      const res = createMockResponse();
      
      await routes.post['/command'](req, res);
      
      expect(mockServer.handlePrioritize).toHaveBeenCalledWith(
        '/src/test.js',
        'high',
        expect.any(String)
      );
    });

    it('should accept custom priority', async () => {
      const req = createMockRequest({ body: { filePath: '/src/test.js', priority: 'critical' } });
      const res = createMockResponse();
      
      await routes.post['/command'](req, res);
      
      expect(mockServer.handlePrioritize).toHaveBeenCalledWith(
        '/src/test.js',
        'critical',
        expect.any(String)
      );
    });

    it('should handle errors with 500 status', async () => {
      mockServer.handlePrioritize.mockRejectedValueOnce(new Error('Processing failed'));
      const req = createMockRequest({ body: { filePath: '/src/test.js' } });
      const res = createMockResponse();
      
      await routes.post['/command'](req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Processing failed' });
    });
  });

  describe('GET /status', () => {
    it('should return current server status', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      routes.get['/status'](req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        currentJob: mockServer.currentJob,
        queueSize: 5,
        isRunning: true,
        stats: mockServer.stats
      });
    });

    it('should reflect current job state', () => {
      mockServer.currentJob = { filePath: '/src/active.js', status: 'processing' };
      const req = createMockRequest();
      const res = createMockResponse();
      
      routes.get['/status'](req, res);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        currentJob: { filePath: '/src/active.js', status: 'processing' }
      }));
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.get['/health'](req, res);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'healthy',
        initialized: true,
        isRunning: true
      }));
    });

    it('should include worker health status', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.get['/health'](req, res);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        workerHealthy: true
      }));
    });

    it('should handle missing worker gracefully', async () => {
      mockServer.worker = null;
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.get['/health'](req, res);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        workerHealthy: false
      }));
    });
  });

  describe('GET /queue', () => {
    it('should return queue information', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      routes.get['/queue'](req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        current: mockServer.currentJob,
        queue: [],
        total: 5,
        stats: mockServer.stats
      });
    });
  });

  describe('POST /restart', () => {
    it('should restart orchestrator', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.post['/restart'](req, res);
      
      expect(mockServer.restart).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ status: 'restarted' });
    });

    it('should handle restart errors', async () => {
      mockServer.restart.mockRejectedValueOnce(new Error('Restart failed'));
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.post['/restart'](req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Restart failed' });
    });
  });
});

describe('Bridge API', () => {
  let mockServer;
  let routes;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockServer = {
      projectPath: '/test/project',
      cache: {
        get: vi.fn().mockReturnValue(null)
      },
      fileWatcher: {
        getStats: vi.fn().mockReturnValue({ watching: true }),
        notifyChange: vi.fn().mockResolvedValue(true)
      },
      batchProcessor: {
        getStats: vi.fn().mockReturnValue({ batches: 0 }),
        getBatchInfo: vi.fn().mockReturnValue(null),
        on: vi.fn(),
        off: vi.fn()
      },
      getFullStatus: vi.fn().mockResolvedValue({ status: 'running' }),
      getFilesStatus: vi.fn().mockResolvedValue([{ path: '/src/test.js', status: 'analyzed' }]),
      getFileTool: vi.fn().mockResolvedValue({ path: '/src/test.js', analysis: {} }),
      getImpactMap: vi.fn().mockResolvedValue({ impacts: [] }),
      handlePrioritize: vi.fn().mockResolvedValue({ status: 'queued' }),
      searchFiles: vi.fn().mockResolvedValue([{ path: '/src/test.js' }]),
      setupWebSocket: vi.fn()
    };
    
    routes = await createBridgeRouteHandlers(mockServer);
  });

  describe('GET /api/status', () => {
    it('should return full system status', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.get['/api/status'](req, res);
      
      expect(mockServer.getFullStatus).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ status: 'running' });
    });

    it('should handle errors', async () => {
      mockServer.getFullStatus.mockRejectedValueOnce(new Error('Status error'));
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.get['/api/status'](req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Status error' });
    });
  });

  describe('GET /api/files', () => {
    it('should return file list with status', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.get['/api/files'](req, res);
      
      expect(mockServer.getFilesStatus).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ path: '/src/test.js', status: 'analyzed' }]);
    });

    it('should handle errors', async () => {
      mockServer.getFilesStatus.mockRejectedValueOnce(new Error('Files error'));
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.get['/api/files'](req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /api/file/*', () => {
    it('should return file analysis', async () => {
      const req = createMockRequest({ params: { 0: 'src/test.js' } });
      const res = createMockResponse();
      
      await routes.get['/api/file/*'](req, res);
      
      expect(mockServer.getFileTool).toHaveBeenCalledWith('src/test.js');
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle nested paths', async () => {
      const req = createMockRequest({ params: { 0: 'src/components/Button.js' } });
      const res = createMockResponse();
      
      await routes.get['/api/file/*'](req, res);
      
      expect(mockServer.getFileTool).toHaveBeenCalledWith('src/components/Button.js');
    });
  });

  describe('GET /api/impact/*', () => {
    it('should return impact map', async () => {
      const req = createMockRequest({ params: { 0: 'src/test.js' } });
      const res = createMockResponse();
      
      await routes.get['/api/impact/*'](req, res);
      
      expect(mockServer.getImpactMap).toHaveBeenCalledWith('src/test.js');
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('POST /api/analyze', () => {
    it('should trigger analysis with valid filePath', async () => {
      const req = createMockRequest({ body: { filePath: '/src/test.js' } });
      const res = createMockResponse();
      
      await routes.post['/api/analyze'](req, res);
      
      expect(mockServer.handlePrioritize).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 when filePath is missing', async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();
      
      await routes.post['/api/analyze'](req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'filePath required' });
    });

    it('should use default priority', async () => {
      const req = createMockRequest({ body: { filePath: '/src/test.js' } });
      const res = createMockResponse();
      
      await routes.post['/api/analyze'](req, res);
      
      expect(mockServer.handlePrioritize).toHaveBeenCalledWith(
        '/src/test.js',
        'high',
        expect.any(String)
      );
    });
  });

  describe('GET /api/search', () => {
    it('should search files with query', async () => {
      const req = createMockRequest({ query: { q: 'test' } });
      const res = createMockResponse();
      
      await routes.get['/api/search'](req, res);
      
      expect(mockServer.searchFiles).toHaveBeenCalledWith('test');
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 when query is missing', async () => {
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();
      
      await routes.get['/api/search'](req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Query parameter q required' });
    });
  });

  describe('GET /api/watcher', () => {
    it('should return watcher stats', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.get['/api/watcher'](req, res);
      
      expect(res.json).toHaveBeenCalledWith({ watching: true });
    });

    it('should handle missing fileWatcher', async () => {
      mockServer.fileWatcher = null;
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.get['/api/watcher'](req, res);
      
      expect(res.json).toHaveBeenCalledWith({ error: 'File watcher not initialized' });
    });
  });

  describe('POST /api/watcher/notify', () => {
    it('should notify file change', async () => {
      const req = createMockRequest({ body: { filePath: '/src/test.js', changeType: 'modified' } });
      const res = createMockResponse();
      
      await routes.post['/api/watcher/notify'](req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        status: 'notified',
        filePath: '/src/test.js',
        changeType: 'modified'
      });
    });

    it('should return 400 when filePath is missing', async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();
      
      await routes.post['/api/watcher/notify'](req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should use default changeType', async () => {
      const req = createMockRequest({ body: { filePath: '/src/test.js' } });
      const res = createMockResponse();
      
      await routes.post['/api/watcher/notify'](req, res);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        changeType: 'modified'
      }));
    });
  });
});

describe('WebSocket API', () => {
  let mockServer;
  let routes;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockServer = {
      bridgeApp: null,
      batchProcessor: {
        getStats: vi.fn().mockReturnValue({ batches: 5 }),
        getBatchInfo: vi.fn().mockReturnValue(null),
        on: vi.fn(),
        off: vi.fn()
      }
    };
    
    routes = { get: {}, post: {} };
    mockServer.bridgeApp = {
      use: vi.fn(),
      get: vi.fn((path, handler) => { routes.get[path] = handler; }),
      post: vi.fn((path, handler) => { routes.post[path] = handler; })
    };
    
    const apiModule = await import('#core/unified-server/api.js');
    apiModule.setupWebSocket.call(mockServer);
  });

  describe('GET /api/batch', () => {
    it('should return batch processor stats', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      await routes.get['/api/batch'](req, res);
      
      expect(res.json).toHaveBeenCalledWith({ batches: 5 });
    });

    it('should handle missing batchProcessor', async () => {
      mockServer.batchProcessor = null;
      const freshRoutes = { get: {}, post: {} };
      mockServer.bridgeApp.get = vi.fn((path, handler) => { freshRoutes.get[path] = handler; });
      
      const apiModule = await import('#core/unified-server/api.js');
      apiModule.setupWebSocket.call(mockServer);
      
      const req = createMockRequest();
      const res = createMockResponse();
      
      await freshRoutes.get['/api/batch'](req, res);
      
      expect(res.json).toHaveBeenCalledWith({ error: 'Batch processor not initialized' });
    });
  });

  describe('GET /api/batch/:id', () => {
    it('should return batch info', async () => {
      mockServer.batchProcessor.getBatchInfo.mockReturnValueOnce({ id: 'batch-123', files: [] });
      const req = createMockRequest({ params: { id: 'batch-123' } });
      const res = createMockResponse();
      
      await routes.get['/api/batch/:id'](req, res);
      
      expect(res.json).toHaveBeenCalledWith({ id: 'batch-123', files: [] });
    });

    it('should return 404 for non-existent batch', async () => {
      const req = createMockRequest({ params: { id: 'non-existent' } });
      const res = createMockResponse();
      
      await routes.get['/api/batch/:id'](req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Batch not found' });
    });
  });

  describe('GET /api/events', () => {
    it('should setup SSE endpoint', () => {
      expect(routes.get['/api/events']).toBeDefined();
    });

    it('should set correct headers', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      routes.get['/api/events'](req, res);
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    });

    it('should send initial connection message', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      routes.get['/api/events'](req, res);
      
      expect(res.write).toHaveBeenCalled();
    });
  });
});

describe('API Builders', () => {
  it('should create valid API request', () => {
    const request = APIRequestBuilder.create()
      .withEndpoint('/api/status')
      .asGet()
      .build();
    
    expect(request.endpoint).toBe('/api/status');
    expect(request.method).toBe('GET');
  });

  it('should create valid API response', () => {
    const response = APIResponseBuilder.create()
      .asSuccess({ status: 'ok' })
      .build();
    
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: 'ok' });
    expect(response.error).toBeNull();
  });

  it('should create error response', () => {
    const response = APIResponseBuilder.create()
      .asError('Not found', 404)
      .build();
    
    expect(response.status).toBe(404);
    expect(response.error.message).toBe('Not found');
    expect(response.data).toBeNull();
  });
});
