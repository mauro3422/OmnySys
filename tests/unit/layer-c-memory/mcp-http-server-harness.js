import { vi } from 'vitest';

export const h = {
  state: {
    initShouldFail: false,
    repoShouldThrow: false,
    apps: [],
    processHandlers: {},
    coreInstance: null,
    httpServer: null
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  },
  refreshToolRegistry: vi.fn(async () => undefined),
  getLiveDefinitions: vi.fn(async () => ([
    { name: 'get_server_status', description: 'Status', inputSchema: { type: 'object', properties: {} } },
    { name: 'restart_server', description: 'Restart', inputSchema: { type: 'object', properties: {} } }
  ])),
  getLiveHandlers: vi.fn(() => ({
    get_server_status: vi.fn()
  })),
  handleRuntimeRestart: vi.fn(async () => ({
    restarting: true,
    restartType: 'component_restart'
  })),
  handleMcpRequest: vi.fn(async () => undefined),
  executeMcpToolCall: vi.fn(async () => ({ content: [] })),
  buildServerForSession: vi.fn(() => ({
    connect: vi.fn(async () => undefined)
  })),
  createConditionalJsonMiddleware: vi.fn(() => vi.fn((req, res, next) => next?.())),
  startHttpServer: vi.fn(async ({ app, host, port, isProxyMode }) => {
    const server = {
      close: vi.fn((callback) => {
        if (typeof callback === 'function') {
          callback();
        }
      })
    };

    h.state.httpServer = server;
    app.__httpServer = server;
    h.state.startArgs = { app, host, port, isProxyMode };
    return server;
  }),
  sessionManager: {
    ensureInitialized: vi.fn(),
    cleanup: vi.fn()
  },
  getRepository: vi.fn(() => {
    if (h.state.repoShouldThrow) {
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
  }),
  MockServer: class MockServer {
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
      h.state.coreInstance = this;
    }

    async initialize() {
      if (h.state.initShouldFail) {
        throw new Error('boot failed');
      }

      this.initialized = true;
    }
  },
  express: vi.fn(() => {
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

    h.state.apps.push(app);
    return app;
  })
};

h.express.json = vi.fn(() => vi.fn((req, res, next) => next?.()));
