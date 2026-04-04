import express from 'express';
import { summarizeMcpParseContext } from '#shared/compiler/index.js';

export function createConditionalJsonMiddleware(logger, buildJsonRpcErrorResponse) {
  return (req, res, next) => {
    const method = String(req?.method || '').toUpperCase();
    if (method !== 'POST') {
      return next();
    }

    express.json({
      verify: (request, _response, buffer) => {
        if (buffer?.length) {
          request.__omnysysRawBody = buffer.toString('utf8');
        }
      }
    })(req, res, (err) => {
      if (!err) return next();

      const context = summarizeMcpParseContext(req);
      logger.warn(
        `[MCP JSON PARSE] ${req.method} ${req.path}: ${err.message} | ${context.headers} | body=${context.bodyPreview}`
      );
      res.status(400).json(buildJsonRpcErrorResponse({
        code: -32700,
        message: 'Parse error: invalid JSON payload'
      }));
    });
  };
}

export { summarizeMcpParseContext };
