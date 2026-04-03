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
