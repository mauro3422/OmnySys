import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transportInstances = [];

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
      this.connect = vi.fn(async (transport) => {
        await transport.connect();
      });
    }
  }

  return {
    transportInstances,
    expressJson: vi.fn(() => (req, res, next) => next()),
    isInitializeRequest: vi.fn(() => false),
    applyPagination: vi.fn((value) => value),
    compactRecentNotifications: vi.fn((value) => value),
    StreamableHTTPServerTransport: createMockTransport,
    Server: MockServer,
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
  ListResourcesRequestSchema: {},
  ListResourceTemplatesRequestSchema: {},
  ErrorCode: mocks.ErrorCode,
  McpError: mocks.McpError,
  isInitializeRequest: mocks.isInitializeRequest
}));

vi.mock('../../../src/layer-c-memory/mcp/core/pagination.js', () => ({
  applyPagination: mocks.applyPagination
}));

vi.mock('../../../src/layer-c-memory/mcp/core/recent-notifications.js', () => ({
  compactRecentNotifications: mocks.compactRecentNotifications
}));

import {
  buildJsonRpcErrorResponse,
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
    expect(sessionManager.saveSession).toHaveBeenCalledWith('transport-session', { name: 'Claude' }, {});
    expect(sessions.has('deduped-session')).toBe(true);
    expect(sessions.has('transport-session')).toBe(false);

    const transport = mocks.transportInstances[0];
    expect(transport.sessionId).toBe('transport-session');

    await transport.onclose();

    expect(sessionManager.deleteSession).toHaveBeenCalledWith('deduped-session');
    expect(sessions.has('deduped-session')).toBe(false);
  });
});
