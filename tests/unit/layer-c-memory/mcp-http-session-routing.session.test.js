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
  buildJsonRpcErrorResponse,
  buildServerForSession,
  handleMcpRequest
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
      getSessionManager: vi.fn()
    });

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual(buildJsonRpcErrorResponse({
      code: -32000,
      message: 'Bad Request: invalid or missing MCP session',
      id: 44
    }));
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
      getSessionManager: vi.fn(async () => sessionManager)
    });

    expect(sessionManager.getSession).toHaveBeenCalledWith('expired-session');
    expect(res.statusCode).toBe(404);
    expect(res.headers['Mcp-Session-Expired']).toBe('true');
    expect(res.payload).toEqual(buildJsonRpcErrorResponse({
      code: -32001,
      message: 'SESSION_EXPIRED: Re-initialize by sending a new POST /mcp without mcp-session-id.',
      id: 11,
      data: { reason: 'session_not_found' }
    }));
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
      getSessionManager: vi.fn(async () => sessionManager)
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
      getSessionManager: vi.fn(async () => sessionManager)
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
      getSessionManager: vi.fn(async () => sessionManager)
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
      getSessionManager: vi.fn(async () => sessionManager)
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
      getSessionManager: vi.fn(async () => sessionManager)
    });

    await handleMcpRequest(reqB, resB, {
      logger,
      sessions,
      buildSessionServer,
      getSessionManager: vi.fn(async () => sessionManager)
    });

    expect(mocks.transportInstances).toHaveLength(2);
    expect(mocks.transportInstances[0].config.enableJsonResponse).toBe(true);
    expect(mocks.transportInstances[1].config.enableJsonResponse).toBe(true);
    expect(mocks.transportInstances[0].config.eventStore).toBeDefined();
    expect(mocks.transportInstances[0].config.eventStore).toBe(mocks.transportInstances[1].config.eventStore);
    expect(typeof mocks.transportInstances[0].config.eventStore.storeEvent).toBe('function');
  });

  it('normalizes degraded Accept headers before dispatching to the transport', async () => {
    const logger = createLogger();
    const sessions = new Map();
    const sessionManager = createSessionManager({
      reserveSession: vi.fn(() => ({
        sessionId: 'transport-session',
        reused: false,
        source: 'new'
      })),
      saveSession: vi.fn(() => 'transport-session')
    });
    const buildSessionServer = createBuildSessionServer();
    const req = {
      headers: {
        accept: 'application/json'
      },
      method: 'POST',
      path: '/mcp',
      body: {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'Codex'
          }
        },
        id: 51
      }
    };
    const res = createResponse();

    mocks.isInitializeRequest.mockReturnValueOnce(true);

    await handleMcpRequest(req, res, {
      logger,
      sessions,
      buildSessionServer,
      getSessionManager: vi.fn(async () => sessionManager)
    });

    const transport = mocks.transportInstances[0];
    expect(req.headers.accept).toBe('application/json, text/event-stream');
    expect(transport.handleRequest).toHaveBeenCalledWith(req, res, req.body);
  });
});

describe('buildServerForSession', () => {
  it('exposes a read-only MCP resource catalog for discovery', async () => {
    const logger = createLogger();
    const getLiveToolDefinitions = vi.fn(async () => ([
      { name: 'mcp_omnysystem_get_server_status', description: 'Status', inputSchema: { type: 'object', properties: {} } }
    ]));
    const getRuntimeResourceSnapshot = vi.fn(async () => ({
      status: { ready: true },
      health: { status: 'healthy' },
      sessions: { runtimeSessions: 1 },
      tools: { snapshot: { summary: { totalTools: 1, categories: [] } } },
      schema: { protocol: '2025-11-25' }
    }));

    const server = buildServerForSession({
      logger,
      getLiveToolDefinitions,
      executeMcpToolCall: vi.fn(),
      getRuntimeResourceSnapshot
    });

    const listResources = server.handlers.get(mocks.ListResourcesRequestSchema);
    const readResource = server.handlers.get(mocks.ReadResourceRequestSchema);

    expect(listResources).toBeTypeOf('function');
    expect(readResource).toBeTypeOf('function');

    const listed = await listResources();
    expect(listed.resources.map((entry) => entry.uri)).toEqual(expect.arrayContaining([
      'omnysys://status',
      'omnysys://health',
      'omnysys://sessions',
      'omnysys://tools',
      'omnysys://schema'
    ]));

    const schemaResult = await readResource({ params: { uri: 'omnysys://schema' } });
    expect(schemaResult.contents).toHaveLength(1);
    expect(schemaResult.contents[0]).toMatchObject({
      uri: 'omnysys://schema',
      mimeType: 'application/json',
      text: expect.stringContaining('"protocol": "2025-11-25"')
    });
    expect(schemaResult.contents[0]).not.toHaveProperty('name');
    expect(schemaResult.contents[0]).not.toHaveProperty('title');
    expect(schemaResult.contents[0]).not.toHaveProperty('description');
    expect(getRuntimeResourceSnapshot).toHaveBeenCalledTimes(1);
  });
});
