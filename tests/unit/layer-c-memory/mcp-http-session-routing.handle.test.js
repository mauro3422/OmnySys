import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transportInstances = [];
  const serverInstances = [];

  function createMockTransport(config) {
    const transport = {
      config,
      sessionId: config.sessionIdGenerator(),
      handleRequest: vi.fn(async () => undefined),
      onclose: null,
      async connect() {
        if (transport.config.onsessioninitialized) {
          transport.config.onsessioninitialized(transport.sessionId);
        }
      }
    };

    transportInstances.push(transport);
    return transport;
  }

  class MockServer {
    constructor() {
      this.handlers = new Map();
      serverInstances.push(this);
      this.connect = vi.fn(async (transport) => {
        await transport.connect();
      });
    }

    setRequestHandler(schema, handler) {
      this.handlers.set(schema, handler);
    }
  }

  return {
    transportInstances,
    serverInstances,
    expressJson: vi.fn(() => (req, res, next) => next()),
    isInitializeRequest: vi.fn(() => false),
    applyPagination: vi.fn((value) => value),
    compactRecentNotifications: vi.fn((value) => value),
    StreamableHTTPServerTransport: createMockTransport,
    Server: MockServer,
    ListResourcesRequestSchema: {},
    ReadResourceRequestSchema: {},
    ErrorCode: { MethodNotFound: 'MethodNotFound' },
    McpError: function MockMcpError(message) {
      const error = new Error(message);
      error.name = 'McpError';
      Object.setPrototypeOf(error, MockMcpError.prototype);
      return error;
    }
  };
});

vi.mock('express', () => ({
  default: {
    json: mocks.expressJson
  }
}));

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: mocks.StreamableHTTPServerTransport
}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: mocks.Server
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: {},
  ListToolsRequestSchema: {},
  ListResourcesRequestSchema: mocks.ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema: {},
  ReadResourceRequestSchema: mocks.ReadResourceRequestSchema,
  ErrorCode: mocks.ErrorCode,
  McpError: mocks.McpError,
  isInitializeRequest: mocks.isInitializeRequest
}));

vi.mock('../../../src/layer-c-memory/mcp/core/pagination.js', () => ({
  applyPagination: mocks.applyPagination,
  PAGINATION_SCHEMA: {}
}));

vi.mock('../../../src/layer-c-memory/mcp/core/recent-notifications.js', () => ({
  compactRecentNotifications: mocks.compactRecentNotifications
}));

import {
  buildServerForSession,
  handleMcpRequest,
  normalizeMcpRequestHeaders
} from '../../../src/layer-c-memory/mcp-http-session-routing.js';
import {
  createBuildSessionServer,
  createLogger,
  createResponse,
  createSessionManager
} from './test-helpers.js';

beforeEach(() => {
  mocks.transportInstances.length = 0;
  mocks.serverInstances.length = 0;
  mocks.expressJson.mockReset();
  mocks.expressJson.mockReturnValue((req, res, next) => next());
  mocks.isInitializeRequest.mockReset();
  mocks.isInitializeRequest.mockReturnValue(false);
  mocks.applyPagination.mockClear();
  mocks.compactRecentNotifications.mockClear();
});

describe('handleMcpRequest', () => {
  it('returns 400 when the request is missing a valid MCP session', async () => {
    const logger = createLogger();
    const sessions = new Map();
    const req = {
      headers: {},
      method: 'POST',
      body: { id: 44 }
    };
    const res = createResponse();

    await handleMcpRequest(req, res, {
      logger,
      sessions,
      buildSessionServer: createBuildSessionServer(),
      getSessionManager: vi.fn(),
      normalizeMcpRequestHeaders
    });

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: invalid or missing MCP session'
      },
      id: 44
    });
  });

  it('returns 404 for an expired session id', async () => {
    const logger = createLogger();
    const sessions = new Map();
    const sessionManager = createSessionManager({
      getSession: vi.fn(() => null)
    });
    const req = {
      headers: { 'mcp-session-id': 'expired-session' },
      method: 'POST',
      body: { id: 11 }
    };
    const res = createResponse();

    await handleMcpRequest(req, res, {
      logger,
      sessions,
      buildSessionServer: createBuildSessionServer(),
      getSessionManager: vi.fn(async () => sessionManager),
      normalizeMcpRequestHeaders
    });

    expect(sessionManager.getSession).toHaveBeenCalledWith('expired-session');
    expect(res.statusCode).toBe(404);
    expect(res.headers['Mcp-Session-Expired']).toBe('true');
  });

  it('re-initializes when initialize arrives with a stale session id', async () => {
    const logger = createLogger();
    const sessions = new Map();
    const sessionManager = createSessionManager({
      getSession: vi.fn(() => null),
      saveSession: vi.fn(() => 'fresh-session')
    });
    const buildSessionServer = createBuildSessionServer();
    const req = {
      headers: { 'mcp-session-id': 'stale-session' },
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'Claude'
          }
        },
        id: 13
      }
    };
    const res = createResponse();

    mocks.isInitializeRequest.mockReturnValueOnce(true);

    await handleMcpRequest(req, res, {
      logger,
      sessions,
      buildSessionServer,
      getSessionManager: vi.fn(async () => sessionManager),
      normalizeMcpRequestHeaders
    });

    expect(res.statusCode).toBe(200);
    expect(buildSessionServer).toHaveBeenCalledTimes(1);
    expect(sessionManager.saveSession).toHaveBeenCalled();
    expect(sessions.size).toBe(1);
    expect([...sessions.keys()]).toContain('fresh-session');
  });

  it('waits briefly for a persisted session before declaring expiration', async () => {
    const logger = createLogger();
    const sessions = new Map();
    const sessionManager = createSessionManager({
      getSession: vi.fn()
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          id: 'persisted-session',
          client_id: 'Claude'
        })
    });
    const buildSessionServer = createBuildSessionServer();
    const req = {
      headers: { 'mcp-session-id': 'persisted-session' },
      method: 'POST',
      body: { id: 12 }
    };
    const res = createResponse();

    await handleMcpRequest(req, res, {
      logger,
      sessions,
      buildSessionServer,
      getSessionManager: vi.fn(async () => sessionManager),
      normalizeMcpRequestHeaders
    });

    expect(sessionManager.getSession).toHaveBeenCalledTimes(5);
    expect(buildSessionServer).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(sessions.has('persisted-session')).toBe(true);
  });

  it('restores a persisted session and keeps cleanup aligned with the recovered id', async () => {
    const logger = createLogger();
    const sessions = new Map();
    const sessionManager = createSessionManager({
      getSession: vi.fn(() => ({
        id: 'persisted-session',
        client_id: 'Claude'
      }))
    });
    const buildSessionServer = createBuildSessionServer();
    const req = {
      headers: { 'mcp-session-id': 'persisted-session' },
      method: 'POST',
      body: { id: 22 }
    };
    const res = createResponse();

    await handleMcpRequest(req, res, {
      logger,
      sessions,
      buildSessionServer,
      getSessionManager: vi.fn(async () => sessionManager),
      normalizeMcpRequestHeaders
    });

    expect(sessionManager.getSession).toHaveBeenCalledWith('persisted-session');
    expect(buildSessionServer).toHaveBeenCalledTimes(1);
    expect(sessions.has('persisted-session')).toBe(true);

    const transport = mocks.transportInstances[0];
    await transport.onclose();

    expect(sessionManager.deleteSession).toHaveBeenCalledWith('persisted-session');
    expect(sessions.has('persisted-session')).toBe(false);
  });

  it('rebinds the session map when saveSession returns a deduplicated id', async () => {
    const logger = createLogger();
    const sessions = new Map();
    const sessionManager = createSessionManager({
      reserveSession: vi.fn(() => ({
        sessionId: 'transport-session',
        reused: false,
        source: 'new'
      })),
      saveSession: vi.fn(() => 'deduped-session')
    });
    const buildSessionServer = createBuildSessionServer();
    const req = {
      headers: {},
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'Claude'
          }
        },
        id: 33
      }
    };
    const res = createResponse();

    mocks.isInitializeRequest.mockReturnValueOnce(true);

    await handleMcpRequest(req, res, {
      logger,
      sessions,
      buildSessionServer,
      getSessionManager: vi.fn(async () => sessionManager),
      normalizeMcpRequestHeaders
    });

    expect(sessionManager.reserveSession).toHaveBeenCalledWith({ name: 'Claude' }, expect.any(String));
    expect(sessionManager.saveSession).toHaveBeenCalledWith('transport-session', { name: 'Claude' }, {
      transport_origin: 'http_direct',
      transport_origin_source: 'http-session',
      transport_request_phase: 'http-initialize',
      transport_session_header_present: false,
      transport_session_state: 'fresh'
    });
    expect(sessions.has('deduped-session')).toBe(true);
    expect(sessions.has('transport-session')).toBe(false);

    const transport = mocks.transportInstances[0];
    expect(transport.config.enableJsonResponse).toBe(true);
    expect(transport.sessionId).toBe('transport-session');

    await transport.onclose();

    expect(sessionManager.deleteSession).toHaveBeenCalledWith('deduped-session');
    expect(sessions.has('deduped-session')).toBe(false);
  });

  it('shares a single event store across Streamable HTTP transports', async () => {
    const logger = createLogger();
    const sessions = new Map();
    const sessionManager = createSessionManager({
      reserveSession: vi.fn()
        .mockReturnValueOnce({
          sessionId: 'transport-session-a',
          reused: false,
          source: 'new'
        })
        .mockReturnValueOnce({
          sessionId: 'transport-session-b',
          reused: false,
          source: 'new'
        }),
      saveSession: vi.fn((sessionId) => sessionId)
    });
    const buildSessionServer = createBuildSessionServer();
    const reqA = {
      headers: {},
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'Claude'
          }
        },
        id: 41
      }
    };
    const reqB = {
      headers: {},
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'Codex'
          }
        },
        id: 42
      }
    };
    const resA = createResponse();
    const resB = createResponse();

    mocks.isInitializeRequest.mockReturnValue(true);

    await handleMcpRequest(reqA, resA, {
      logger,
      sessions,
      buildSessionServer,
      getSessionManager: vi.fn(async () => sessionManager),
      normalizeMcpRequestHeaders
    });

    await handleMcpRequest(reqB, resB, {
      logger,
      sessions,
      buildSessionServer,
      getSessionManager: vi.fn(async () => sessionManager),
      normalizeMcpRequestHeaders: vi.fn()
    });

    expect(mocks.transportInstances).toHaveLength(2);
    expect(mocks.transportInstances[0].config.enableJsonResponse).toBe(true);
    expect(mocks.transportInstances[1].config.enableJsonResponse).toBe(true);
    expect(mocks.transportInstances[0].config.eventStore).toBeDefined();
    expect(mocks.transportInstances[0].config.eventStore).toBe(mocks.transportInstances[1].config.eventStore);
    expect(typeof mocks.transportInstances[0].config.eventStore.storeEvent).toBe('function');
  });

  it('exposes a read-only MCP resource catalog for discovery', async () => {
    const logger = createLogger();
    const sessionServer = buildServerForSession({
      logger,
      getLiveToolDefinitions: vi.fn(async () => ([{ name: 'one' }, { name: 'two' }])),
      executeMcpToolCall: vi.fn(async () => ({ content: [] })),
      getRuntimeResourceSnapshot: vi.fn(async () => ({
        status: { initialized: true },
        health: { ready: true },
        sessions: { runtimeSessions: 1 },
        tools: { snapshot: true },
        schema: { protocol: '2025-11-25' }
      }))
    });

    const listResourcesHandler = sessionServer.handlers.get(mocks.ListResourcesRequestSchema);
    const resources = await listResourcesHandler({});

    expect(resources.resources.map((resource) => resource.uri)).toEqual([
      'omnysys://status',
      'omnysys://health',
      'omnysys://sessions',
      'omnysys://tools',
      'omnysys://schema'
    ]);
  });
});
