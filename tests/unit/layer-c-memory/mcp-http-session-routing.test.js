import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    expressJson: vi.fn(() => (req, res, next) => next())
  };
});

vi.mock('express', () => ({
  default: {
    json: mocks.expressJson
  }
}));

import {
  buildJsonRpcErrorResponse,
  createConditionalJsonMiddleware,
  normalizeMcpRequestHeaders
} from '../../../src/layer-c-memory/mcp-http-session-routing.js';
import {
  createLogger,
  createResponse
} from './test-helpers.js';

beforeEach(() => {
  mocks.expressJson.mockReset();
  mocks.expressJson.mockReturnValue((req, res, next) => next());
});

describe('createConditionalJsonMiddleware', () => {
  it('returns a parse error when express.json reports malformed JSON', () => {
    const logger = createLogger();
    const middleware = createConditionalJsonMiddleware(logger);
    const req = {
      headers: {
        'content-type': 'application/json',
        'content-length': '17'
      },
      method: 'POST',
      path: '/mcp',
      __omnysysRawBody: '{ broken json }'
    };
    const res = createResponse();
    const next = vi.fn();

    mocks.expressJson.mockReturnValueOnce((request, response, callback) => {
      expect(request.__omnysysRawBody).toBe('{ broken json }');
      callback(new Error('Unexpected token }'));
    });

    middleware(req, res, next);

    expect(mocks.expressJson).toHaveBeenCalledWith(expect.objectContaining({
      verify: expect.any(Function)
    }));
    expect(logger.warn).toHaveBeenCalledWith(
      '[MCP JSON PARSE] POST /mcp: Unexpected token } | content-type=application/json, content-length=17 | body={ broken json }'
    );
    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual(buildJsonRpcErrorResponse({
      code: -32700,
      message: 'Parse error: invalid JSON payload'
    }));
    expect(next).not.toHaveBeenCalled();
  });
});

describe('buildJsonRpcErrorResponse', () => {
  it('builds a standard JSON-RPC error payload and includes optional data', () => {
    expect(buildJsonRpcErrorResponse({
      code: -32001,
      message: 'SESSION_EXPIRED',
      id: 99,
      data: { reason: 'session_not_found' }
    })).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'SESSION_EXPIRED',
        data: { reason: 'session_not_found' }
      },
      id: 99
    });
  });
});

describe('normalizeMcpRequestHeaders', () => {
  it('adds missing MCP accept types for POST requests', () => {
    const logger = createLogger();
    const req = {
      method: 'POST',
      path: '/mcp',
      headers: {
        accept: 'application/json'
      },
      rawHeaders: ['Accept', 'application/json']
    };

    normalizeMcpRequestHeaders(req, logger);

    expect(req.headers.accept).toBe('application/json, text/event-stream');
    expect(req.rawHeaders).toEqual(['Accept', 'application/json, text/event-stream']);
    expect(logger.debug).toHaveBeenCalledWith(
      '[MCP COMPAT] Normalized Accept header for POST /mcp -> application/json, text/event-stream'
    );
  });

  it('adds the SSE accept type for GET requests', () => {
    const logger = createLogger();
    const req = {
      method: 'GET',
      path: '/mcp',
      headers: {
        accept: '*/*'
      }
    };

    normalizeMcpRequestHeaders(req, logger);

    expect(req.headers.accept).toBe('*/*, text/event-stream');
  });
});
