import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state = {
    initShouldFail: false,
    repoShouldThrow: false,
    apps: [],
    processHandlers: {},
    coreInstance: null,
    httpServer: null
  };

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  };

  const refreshToolRegistry = vi.fn(async () => undefined);
  const getLiveDefinitions = vi.fn(async () => ([
    { name: 'get_server_status', description: 'Status' },
    { name: 'restart_server', description: 'Restart' }
  ]));
  const getLiveHandlers = vi.fn(() => ({
    get_server_status: vi.fn()
  }));
  const handleRuntimeRestart = vi.fn(async () => ({
    restarting: true,
    restartType: 'component_restart'
  }));
  const handleMcpRequest = vi.fn(async () => undefined);
  const executeMcpToolCall = vi.fn(async () => ({ content: [] }));
  const buildServerForSession = vi.fn(() => ({
    connect: vi.fn(async () => undefined)
  }));
  const createConditionalJsonMiddleware = vi.fn(() => vi.fn((req, res, next) => next?.()));
  const startHttpServer = vi.fn(async ({ app }) => {
    const server = {
      close: vi.fn((callback) => {
        if (typeof callback === 'function') {
          callback();
        }
      })
    };

    state.httpServer = server;
    app.__httpServer = server;
    return server;
  });
  const sessionManager = {
    ensureInitialized: vi.fn(),
    cleanup: vi.fn()
  };
  const getRepository = vi.fn(() => {
    if (state.repoShouldThrow) {
      throw new Error('repo unavailable');
    }

    const prepare = vi.fn((sql) => ({
      get: vi.fn(() => {
        if (String(sql).includes('is_phase2_complete')) {
          return { n: 2 };
        }

        if (String(sql).includes('societies')) {
          return { n: 1 };
        }

        return { n: 0 };
      })
    }));

    return { db: { prepare } };
  });

  class MockServer {
    constructor(projectPath) {
      this.projectPath = projectPath;
      this.initialized = false;
      this.sessions = null;
      this.cache = {
        purge: vi.fn(async () => undefined),
        initialize: vi.fn(async () => undefined),
        set: vi.fn()
      };
      this.orchestrator = {
        phase2Status: 'running'
      };
      this.server = null;
      this.wsManager = {
        get: vi.fn()
      };
      this.shutdown = vi.fn(async () => undefined);
      state.coreInstance = this;
    }

    async initialize() {
      if (state.initShouldFail) {
        throw new Error('boot failed');
      }

      this.initialized = true;
    }
  }

  const express = vi.fn(() => {
    const routes = {
      use: [],
      get: {},
      post: {},
      all: {}
    };

    const app = {
      __routes: routes,
      use: vi.fn((...args) => {
        routes.use.push(args);
      }),
      get: vi.fn((path, ...handlers) => {
        routes.get[path] = handlers;
      }),
      post: vi.fn((path, ...handlers) => {
        routes.post[path] = handlers;
      }),
      all: vi.fn((path, ...handlers) => {
        routes.all[path] = handlers;
      })
    };

    state.apps.push(app);
    return app;
  });

  express.json = vi.fn(() => vi.fn((req, res, next) => next?.()));

  return {
    state,
    logger,
    refreshToolRegistry,
    getLiveDefinitions,
    getLiveHandlers,
    handleRuntimeRestart,
    handleMcpRequest,
    executeMcpToolCall,
    buildServerForSession,
    createConditionalJsonMiddleware,
    startHttpServer,
    sessionManager,
    getRepository,
    MockServer,
    express
  };
});

vi.mock('v8', () => ({
  default: {
    getHeapStatistics: () => ({ heap_size_limit: 8 * 1024 * 1024 * 1024 })
  }
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn()
  }))
}));

vi.mock('express', () => ({
  default: h.express
}));

vi.mock('../../../src/layer-c-memory/utils/logger.js', () => ({
  createLogger: () => h.logger
}));

vi.mock('../../../src/layer-c-memory/mcp/core/server-class.js', () => ({
  OmnySysMCPServer: h.MockServer
}));

vi.mock('../../../src/layer-c-memory/mcp/restart-runtime.js', () => ({
  handleRuntimeRestart: h.handleRuntimeRestart
}));

vi.mock('../../../src/layer-c-memory/mcp-http-listener.js', () => ({
  startHttpServer: h.startHttpServer
}));

vi.mock('../../../src/layer-c-memory/mcp-http-session-routing.js', () => ({
  buildServerForSession: h.buildServerForSession,
  createConditionalJsonMiddleware: h.createConditionalJsonMiddleware,
  executeMcpToolCall: h.executeMcpToolCall,
  handleMcpRequest: h.handleMcpRequest
}));

vi.mock('../../../src/layer-c-memory/mcp/tool-registry-runtime.js', () => ({
  refreshToolRegistry: h.refreshToolRegistry,
  getLiveDefinitions: h.getLiveDefinitions,
  getLiveHandlers: h.getLiveHandlers
}));

vi.mock('../../../src/layer-c-memory/storage/repository/index.js', () => ({
  getRepository: h.getRepository
}));

vi.mock('../../../src/layer-c-memory/mcp/core/session-manager.js', () => ({
  sessionManager: h.sessionManager
}));

function createResponse() {
  return {
    headersSent: false,
    statusCode: 200,
    headers: {},
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(body) {
      this.payload = body;
      this.headersSent = true;
      return body;
    }
  };
}

async function loadServerModule(options = {}) {
  h.state.initShouldFail = options.initShouldFail || false;
  h.state.repoShouldThrow = options.repoShouldThrow || false;
  h.state.apps.length = 0;
  h.state.processHandlers = {};
  h.state.coreInstance = null;
  h.state.httpServer = null;
  vi.resetModules();

  const onceSpy = vi.spyOn(process, 'once').mockImplementation((event, handler) => {
    h.state.processHandlers[event] = handler;
    return process;
  });

  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined);

  const mod = await import('../../../src/layer-c-memory/mcp-http-server.js');
  await Promise.resolve();
  await Promise.resolve();

  return {
    mod,
    app: h.state.apps[0],
    core: h.state.coreInstance,
    httpServer: h.state.httpServer,
    onceSpy,
    exitSpy
  };
}

describe('mcp-http-server bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('registers the expected HTTP routes and serves health/tools/restart responses', async () => {
    const { mod, app, core } = await loadServerModule();
    const routes = app.__routes;
    const expectedHealth = mod.buildHealthSnapshot({
      initialized: true,
      initError: null,
      projectPath: core.projectPath,
      sessionCount: 0,
      background: {
        phase2PendingFiles: 2,
        societiesCount: 1,
        phase2: 'running'
      }
    });

    expect(app.all).toHaveBeenCalledWith('/mcp', expect.any(Function), expect.any(Function));
    expect(app.all).toHaveBeenCalledWith('/', expect.any(Function), expect.any(Function));
    expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(app.get).toHaveBeenCalledWith('/tools', expect.any(Function));
    expect(app.post).toHaveBeenCalledWith('/restart', expect.any(Function), expect.any(Function));
    expect(core.initialized).toBe(true);

    const healthRes = createResponse();
    await routes.get['/health'][0]({}, healthRes);

    expect(healthRes.payload).toEqual(expectedHealth);
    expect(mod.buildHealthSnapshot({
      initialized: true,
      initError: null,
      projectPath: core.projectPath,
      sessionCount: 0,
      background: {
        phase2PendingFiles: 2,
        societiesCount: 1,
        phase2: 'running'
      }
    })).toEqual(expectedHealth);

    const toolsRes = createResponse();
    await routes.get['/tools'][0]({}, toolsRes);

    expect(toolsRes.payload).toEqual({
      count: 2,
      tools: [
        { name: 'get_server_status', description: 'Status' },
        { name: 'restart_server', description: 'Restart' }
      ]
    });

    const restartRes = createResponse();
    const restartReq = { body: { clearCache: true } };

    await routes.post['/restart'][1](restartReq, restartRes);

    expect(h.handleRuntimeRestart).toHaveBeenCalledWith(
      { clearCache: true },
      expect.objectContaining({
        server: core,
        cache: core.cache,
        orchestrator: core.orchestrator,
        refreshToolRegistry: expect.any(Function)
      })
    );
    expect(restartRes.payload).toEqual({
      restarting: true,
      restartType: 'component_restart'
    });
  });

  it('marks health degraded when initialization fails and falls back on missing repository data', async () => {
    const { mod, app, core } = await loadServerModule({
      initShouldFail: true,
      repoShouldThrow: true
    });

    const healthRes = createResponse();
    await app.__routes.get['/health'][0]({}, healthRes);

    expect(healthRes.payload).toEqual(mod.buildHealthSnapshot({
      initialized: false,
      initError: new Error('boot failed'),
      projectPath: core.projectPath,
      sessionCount: 0,
      background: null
    }));
  });

  it('shuts down only once even if multiple termination signals arrive', async () => {
    const { core, httpServer, onceSpy, exitSpy } = await loadServerModule();
    const sigint = h.state.processHandlers.SIGINT;
    const sigterm = h.state.processHandlers.SIGTERM;

    expect(onceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(onceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(sigint).toEqual(expect.any(Function));
    expect(sigterm).toEqual(expect.any(Function));

    await sigint();
    await sigterm();

    expect(core.shutdown).toHaveBeenCalledTimes(1);
    expect(httpServer.close).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
