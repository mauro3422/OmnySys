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

function normalizeIdentityValue(candidate) {
  return typeof candidate === 'string' ? candidate.trim() : '';
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
  const normalizedClientInfo = clientInfo && typeof clientInfo === 'object' ? clientInfo : {};
  const normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : {};
  const normalizedRequestContext = requestContext && typeof requestContext === 'object' ? requestContext : {};
  const explicitOrigin = normalizeTransportOrigin(
    normalizedMetadata.transport_origin
      || normalizedMetadata.transportOrigin
      || normalizedClientInfo.transport_origin
      || normalizedClientInfo.transportOrigin,
    'unknown'
  );

  if (explicitOrigin !== 'unknown') {
    return explicitOrigin;
  }

  if (normalizedMetadata.shell_http_fallback === true || normalizedClientInfo.shell_http_fallback === true || normalizedRequestContext.shellHttpFallback === true) {
    return 'shell_http_fallback';
  }

  if (
    normalizedClientInfo.bridge_recovery === true
    || normalizedClientInfo.bridge_recovery_trigger
    || normalizedClientInfo.recovery_mode === 'bridge'
    || normalizedRequestContext.transportMode === 'stdio'
  ) {
    return 'stdio_bridge';
  }

  if (normalizedRequestContext.transportMode === 'http' || normalizedRequestContext.isHttpRequest === true) {
    return 'http_direct';
  }

  return normalizeTransportOrigin(normalizedRequestContext.defaultOrigin || 'native_mcp', 'native_mcp');
}

export function buildTransportHandshakeSignature({
  clientInfo = {},
  metadata = {},
  requestContext = {},
  sessionKind = null
} = {}) {
  const origin = normalizeTransportOrigin(
    metadata?.transport_origin
      || clientInfo?.transport_origin
      || requestContext?.transportOrigin,
    'unknown'
  );
  const originSource = normalizeIdentityValue(
    metadata?.transport_origin_source
      || clientInfo?.transport_origin_source
      || requestContext?.transportOriginSource
      || 'inferred'
  ) || 'inferred';
  const clientRouteId = normalizeIdentityValue(
    metadata?.transport_client_route_id
      || clientInfo?.client_route_id
      || clientInfo?.original_client_route_id
      || clientInfo?.transport_client_route_id
      || metadata?.client_route_id
      || metadata?.original_client_route_id
      || ''
  );
  const clientId = normalizeIdentityValue(
    metadata?.transport_client_id
      || clientInfo?.client_id
      || clientInfo?.original_client_id
      || clientInfo?.transport_client_id
      || metadata?.client_id
      || metadata?.original_client_id
      || ''
  );
  const requestPhase = normalizeIdentityValue(
    metadata?.transport_request_phase
      || requestContext?.transportRequestPhase
      || sessionKind
      || 'http-session'
  ) || 'http-session';
  const resolvedSessionKind = normalizeIdentityValue(
    metadata?.transport_session_kind
      || sessionKind
      || requestContext?.sessionKind
      || 'unknown'
  ) || 'unknown';
  const headerState = metadata?.transport_session_header_present === true
    || clientInfo?.transport_session_header_present === true
    || requestContext?.transportSessionHeaderPresent === true
    ? 'header-present'
    : 'header-missing';

  if (!clientRouteId && !clientId) {
    return 'unknown';
  }

  return [
    origin,
    originSource,
    clientRouteId || 'unknown',
    clientId || 'unknown',
    requestPhase,
    resolvedSessionKind,
    headerState
  ].join('|');
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
  const transportClientId = normalizeIdentityValue(
    metadata?.transport_client_id
      || clientInfo?.transport_client_id
      || clientInfo?.client_id
      || clientInfo?.original_client_id
      || clientId
  ) || null;
  const transportClientRouteId = normalizeIdentityValue(
    metadata?.transport_client_route_id
      || clientInfo?.transport_client_route_id
      || clientInfo?.client_route_id
      || clientInfo?.original_client_route_id
      || transportClientId
  ) || null;
  const transportClientName = normalizeIdentityValue(
    metadata?.transport_client_name
      || clientInfo?.transport_client_name
      || clientInfo?.name
      || clientInfo?.original_name
      || transportClientId
      || transportClientRouteId
  ) || null;
  const transportRequestPhase = normalizeIdentityValue(
    metadata?.transport_request_phase
      || clientInfo?.transport_request_phase
      || sessionKind
      || null
  ) || null;
  const transportRouteOriginHint = normalizeIdentityValue(
    metadata?.transport_route_origin_hint
      || clientInfo?.transport_route_origin_hint
      || null
  ) || null;
  const transportSessionHeaderPresent = metadata?.transport_session_header_present === true
    || clientInfo?.transport_session_header_present === true;
  const transportHandshakeSignature = normalizeIdentityValue(
    metadata?.transport_handshake_signature
      || clientInfo?.transport_handshake_signature
      || buildTransportHandshakeSignature({
        clientInfo,
        metadata,
        requestContext: {
          transportOrigin: origin,
          transportOriginSource: source,
          transportRequestPhase,
          transportSessionHeaderPresent,
          sessionKind
        },
        sessionKind
      })
  ) || 'unknown';
  const transportMetadata = {
    ...(metadata || {}),
    transport_origin: normalizeTransportOrigin(origin, 'unknown'),
    transport_origin_source: source,
    transport_client_id: transportClientId,
    transport_client_route_id: transportClientRouteId,
    transport_client_name: transportClientName,
    transport_request_phase: transportRequestPhase,
    transport_session_header_present: transportSessionHeaderPresent,
    transport_route_origin_hint: transportRouteOriginHint,
    transport_handshake_signature: transportHandshakeSignature,
    transport_session_kind: sessionKind,
    transport_session_id: sessionId || null
  };

  return {
    transport_origin: normalizeTransportOrigin(origin, 'unknown'),
    transport_origin_source: source,
    transport_session_kind: sessionKind,
    transport_session_id: sessionId || null,
    transport_client_id: transportClientId,
    transport_client_route_id: transportClientRouteId,
    transport_client_name: transportClientName,
    transport_request_phase: transportRequestPhase,
    transport_session_header_present: transportSessionHeaderPresent,
    transport_route_origin_hint: transportRouteOriginHint,
    transport_handshake_signature: transportHandshakeSignature,
    transport_client_info: clientInfo || null,
    transport_metadata: transportMetadata
  };
}
