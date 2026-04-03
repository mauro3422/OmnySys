import express from 'express';

const MCP_RAW_BODY_PREVIEW_LIMIT = 512;

export function summarizeMcpParseContext(req) {
  const rawBody = typeof req?.__omnysysRawBody === 'string' ? req.__omnysysRawBody : '';
  const headers = [];

  const contentType = req?.headers?.['content-type'];
  if (contentType) headers.push(`content-type=${contentType}`);

  const contentLength = req?.headers?.['content-length'];
  if (contentLength) headers.push(`content-length=${contentLength}`);

  const sessionId = req?.headers?.['mcp-session-id'];
  if (sessionId) headers.push(`mcp-session-id=${sessionId}`);

  const preview = rawBody
    ? rawBody.length > MCP_RAW_BODY_PREVIEW_LIMIT
      ? `${rawBody.slice(0, MCP_RAW_BODY_PREVIEW_LIMIT)}...`
      : rawBody
    : '';

  return {
    headers: headers.length ? headers.join(', ') : 'none',
    bodyPreview: preview || 'unavailable'
  };
}

export function createConditionalJsonMiddleware(logger, buildJsonRpcErrorResponse) {
  return (req, res, next) => {
    if (req.headers['mcp-session-id']) {
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
