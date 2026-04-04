const KNOWN_TRANSPORT_ORIGINS = new Set([
  'native_mcp',
  'stdio_bridge',
  'http_direct',
  'shell_http_fallback',
  'unknown'
]);

const TRANSPORT_ORIGIN_ALIASES = new Map([
  ['stdio', 'stdio_bridge'],
  ['bridge', 'stdio_bridge'],
  ['mcp', 'native_mcp'],
  ['native', 'native_mcp'],
  ['http', 'http_direct'],
  ['direct_http', 'http_direct'],
  ['shell', 'shell_http_fallback'],
  ['fallback', 'shell_http_fallback']
]);

function normalizeCandidate(candidate) {
  if (typeof candidate !== 'string') {
    return '';
  }

  return candidate.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function normalizeTransportOrigin(value, fallback = 'unknown') {
  const normalized = normalizeCandidate(value);
  if (!normalized) {
    return KNOWN_TRANSPORT_ORIGINS.has(fallback) ? fallback : 'unknown';
  }

  const alias = TRANSPORT_ORIGIN_ALIASES.get(normalized) || normalized;
  return KNOWN_TRANSPORT_ORIGINS.has(alias) ? alias : (KNOWN_TRANSPORT_ORIGINS.has(fallback) ? fallback : 'unknown');
}

export function inferTransportOrigin({
  clientInfo = {},
  metadata = {},
  requestContext = {}
} = {}) {
  const explicitOrigin = normalizeTransportOrigin(
    metadata.transport_origin
      || metadata.transportOrigin
      || clientInfo.transport_origin
      || clientInfo.transportOrigin,
    'unknown'
  );

  if (explicitOrigin !== 'unknown') {
    return explicitOrigin;
  }

  if (metadata.shell_http_fallback === true || clientInfo.shell_http_fallback === true || requestContext.shellHttpFallback === true) {
    return 'shell_http_fallback';
  }

  if (
    clientInfo.bridge_recovery === true
    || clientInfo.bridge_recovery_trigger
    || clientInfo.recovery_mode === 'bridge'
    || requestContext.transportMode === 'stdio'
  ) {
    return 'stdio_bridge';
  }

  if (requestContext.transportMode === 'http' || requestContext.isHttpRequest === true) {
    return 'http_direct';
  }

  return normalizeTransportOrigin(requestContext.defaultOrigin || 'native_mcp', 'native_mcp');
}

export function buildTransportProvenance({
  origin,
  source = 'inferred',
  clientInfo = null,
  metadata = null,
  sessionId = null,
  clientId = null,
  sessionKind = null
} = {}) {
  return {
    transport_origin: normalizeTransportOrigin(origin, 'unknown'),
    transport_origin_source: source,
    transport_session_kind: sessionKind,
    transport_session_id: sessionId || null,
    transport_client_id: clientId || null,
    transport_client_info: clientInfo || null,
    transport_metadata: metadata || null
  };
}
