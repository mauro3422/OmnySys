import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { applyPagination } from './core/pagination.js';
import { executeToolCall } from './core/initialization/steps/mcp-tool-call-helpers.js';
import { alignFolderizationSnapshotToolResult } from './core/initialization/steps/mcp-tool-call-telemetry.js';
import { buildInitializationPendingToolResult } from './core/initialization/progress-state.js';
import {
  buildJsonRpcErrorResponse
} from './http-session-routing-helpers.js';
import {
  buildTransportProvenance,
  inferTransportOrigin
} from './transport-provenance.js';
import {
  buildMcpRequestDeliveryTelemetry,
  persistMcpRequestDeliveryTelemetry,
  buildRestartLifecycleGuidance
} from '../../shared/compiler/index.js';

const SESSION_RECOVERY_ATTEMPTS = Number(process.env.OMNYSYS_SESSION_RECOVERY_ATTEMPTS || 720); // 720 * 250ms = 180s
const SESSION_RECOVERY_DELAY_MS = Number(process.env.OMNYSYS_SESSION_RECOVERY_DELAY_MS || 250);
const sharedEventStore = new (await import('@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js')).InMemoryEventStore();
const staleInitRecoveryInFlight = new Set();

function getRequestHeaderValue(headers = {}, name) {
  const target = String(name || '').toLowerCase();
  if (!target) return '';

  const direct = headers[target];
  if (typeof direct === 'string') {
    return direct.trim();
  }

  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === target);
  if (!matchedKey) return '';

  const value = headers[matchedKey];
  return typeof value === 'string' ? value.trim() : '';
}

function buildHttpTransportIdentityFromHeaders(requestHeaders = {}) {
  const clientId = getRequestHeaderValue(requestHeaders, 'x-omnysys-client-id');
  const clientRouteId = getRequestHeaderValue(requestHeaders, 'x-omnysys-client-route-id') || clientId;
  const clientName = getRequestHeaderValue(requestHeaders, 'x-omnysys-client-name') || clientId;
  const transportOrigin = getRequestHeaderValue(requestHeaders, 'x-omnysys-transport-origin');
  const transportOriginSource = getRequestHeaderValue(requestHeaders, 'x-omnysys-transport-origin-source');
  const transportRouteOriginHint = getRequestHeaderValue(requestHeaders, 'x-omnysys-route-origin-hint');
  const transportHandshakeSignature = getRequestHeaderValue(requestHeaders, 'x-omnysys-handshake-signature')
    || getRequestHeaderValue(requestHeaders, 'x-mcp-handshake-signature');

  return {
    client_id: clientId || undefined,
    original_client_id: clientId || undefined,
    client_route_id: clientRouteId || undefined,
    original_client_route_id: clientRouteId || undefined,
    name: clientName || undefined,
    original_name: clientName || undefined,
    transport_client_id: clientId || undefined,
    transport_client_route_id: clientRouteId || undefined,
    transport_client_name: clientName || undefined,
    transport_origin: transportOrigin || undefined,
    transport_origin_source: transportOriginSource || undefined,
    transport_route_origin_hint: transportRouteOriginHint || undefined,
    transport_handshake_signature: transportHandshakeSignature || undefined,
    transport_session_header_present: Boolean(
      getRequestHeaderValue(requestHeaders, 'mcp-session-id')
      || getRequestHeaderValue(requestHeaders, 'x-mcp-session-id')
    )
  };
}

export function shouldSkipStaleInitRecovery(sessionId) {
  const key = String(sessionId || 'unknown');
  if (staleInitRecoveryInFlight.has(key)) {
    return true;
  }

  staleInitRecoveryInFlight.add(key);
  queueMicrotask(() => {
    staleInitRecoveryInFlight.delete(key);
  });

  return false;
}

async function waitForPersistedSession(sessionManager, sessionId) {
  for (let attempt = 0; attempt < SESSION_RECOVERY_ATTEMPTS; attempt += 1) {
    const persistedSession = sessionManager.getSession(sessionId);
    if (persistedSession) {
      return persistedSession;
    }

    if (attempt < SESSION_RECOVERY_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, SESSION_RECOVERY_DELAY_MS));
    }
  }

  return null;
}

function buildSessionTransportContext({
  clientInfo = {},
  metadata = {},
  requestHeaders = {},
  sessionId = null,
  sessionKind = 'http'
} = {}) {
  const headerClientInfo = buildHttpTransportIdentityFromHeaders(requestHeaders);
  const mergedClientInfo = {
    ...headerClientInfo,
    ...(clientInfo && typeof clientInfo === 'object' ? clientInfo : {})
  };
  const mergedMetadata = {
    ...headerClientInfo,
    ...metadata
  };
  const transportRequestPhase = mergedMetadata.transport_request_phase || sessionKind || 'http-session';
  const transportSessionHeaderPresent = mergedMetadata.transport_session_header_present
    ?? mergedClientInfo.transport_session_header_present
    ?? false;
  const origin = inferTransportOrigin({
    clientInfo: mergedClientInfo,
    metadata: mergedMetadata,
    requestContext: {
      defaultOrigin: 'native_mcp',
      isHttpRequest: true,
      transportMode: mergedMetadata.transport_origin === 'stdio_bridge' ? 'stdio' : 'http',
      transportRequestPhase,
      transportSessionHeaderPresent
    }
  });

  return buildTransportProvenance({
    origin,
    source: mergedMetadata.transport_origin_source
      || mergedClientInfo.transport_origin_source
      || (mergedClientInfo.bridge_recovery ? 'bridge-recovery' : 'http-session'),
    clientInfo: mergedClientInfo,
    metadata: mergedMetadata,
    sessionId,
    clientId: mergedClientInfo?.client_id || mergedClientInfo?.original_client_id || mergedClientInfo?.name || mergedClientInfo?.original_name || 'unknown',
    sessionKind
  });
}

function classifyMcpRequestKind(body = {}) {
  const method = typeof body?.method === 'string' ? body.method.trim() : '';
  if (!method) {
    return body?.params?.name ? 'tools_call' : 'unknown';
  }

  if (method === 'initialize') return 'initialize';
  if (method === 'tools/list') return 'tools_list';
  if (method === 'tools/call') return 'tools_call';
  if (method === 'resources/read') return 'resource_read';
  if (method === 'ping') return 'ping';

  return method.toLowerCase().replace(/[\s/.-]+/g, '_');
}

function createMcpRequestDeliveryTracker({
  transportContext,
  req,
  startedAt = new Date()
} = {}) {
  const startedAtIso = startedAt.toISOString();
  const startedAtMs = startedAt.getTime();
  let toolOutcomeReadyAtMs = null;
  let responseFinishedAtMs = null;
  let responseClosedAtMs = null;
  let responseStatusCode = null;

  return {
    markToolOutcomeReady() {
      if (!toolOutcomeReadyAtMs) {
        toolOutcomeReadyAtMs = Date.now();
      }
    },
    markResponseFinished(statusCode = null) {
      if (!responseFinishedAtMs) {
        responseFinishedAtMs = Date.now();
      }
      if (Number.isFinite(Number(statusCode))) {
        responseStatusCode = Number(statusCode);
      }
    },
    markResponseClosed() {
      if (!responseClosedAtMs) {
        responseClosedAtMs = Date.now();
      }
    },
    finalize({ errorMessage = null } = {}) {
      const requestFinishedAtMs = Date.now();
      const requestKind = classifyMcpRequestKind(req?.body || {});
      const transportMetadata = transportContext?.transport_metadata || {};
      const responseFinishedIso = responseFinishedAtMs ? new Date(responseFinishedAtMs).toISOString() : null;
      const responseClosedIso = responseClosedAtMs ? new Date(responseClosedAtMs).toISOString() : null;
      const toolOutcomeReadyIso = toolOutcomeReadyAtMs ? new Date(toolOutcomeReadyAtMs).toISOString() : null;
      const requestFinishedIso = new Date(requestFinishedAtMs).toISOString();
      const deliveryState = errorMessage
        ? 'failed'
        : responseFinishedAtMs
          ? 'delivered'
          : responseClosedAtMs
            ? 'interrupted'
            : 'unknown';
      const deliveryReason = errorMessage
        || (deliveryState === 'delivered'
          ? 'response_finished'
          : deliveryState === 'interrupted'
            ? 'response_closed_before_finish'
            : 'response_not_observed');
      const deliveryLatencyMs = responseFinishedAtMs
        ? Math.max(0, responseFinishedAtMs - startedAtMs)
        : Math.max(0, requestFinishedAtMs - startedAtMs);
      const toolOutcomeGapMs = toolOutcomeReadyAtMs && responseFinishedAtMs
        ? Math.max(0, responseFinishedAtMs - toolOutcomeReadyAtMs)
        : 0;

      return buildMcpRequestDeliveryTelemetry({
        projectPath: transportContext?.projectPath || null,
        sessionId: transportContext?.transport_session_id || null,
        clientId: transportContext?.transport_client_id || null,
        clientRouteId: transportContext?.transport_client_route_id || null,
        clientName: transportContext?.transport_client_name || null,
        transportOrigin: transportContext?.transport_origin || 'unknown',
        transportOriginSource: transportContext?.transport_origin_source || 'unknown',
        transportRequestPhase: transportContext?.transport_request_phase || 'unknown',
        transportSessionId: transportContext?.transport_session_id || null,
        transportSessionHeaderPresent: transportContext?.transport_session_header_present === true,
        transportHandshakeSignature: transportContext?.transport_handshake_signature || 'unknown',
        requestMethod: req?.method || null,
        requestKind,
        requestId: req?.body?.id ?? null,
        toolName: req?.body?.params?.name || null,
        captureSource: 'mcp.http',
        requestStartedAt: startedAtIso,
        requestFinishedAt: requestFinishedIso,
        requestDurationMs: Math.max(0, requestFinishedAtMs - startedAtMs),
        toolOutcomeReadyAt: toolOutcomeReadyIso,
        responseFinishedAt: responseFinishedIso,
        responseClosedAt: responseClosedIso,
        responseStatusCode,
        deliveryState,
        deliveryReason,
        deliveryLatencyMs,
        toolOutcomeGapMs,
        errorMessage,
        argsJson: typeof req?.body === 'object' ? JSON.stringify(req.body) : null,
        createdAt: requestFinishedIso
      });
    },
    buildEvent({ deliveryState = 'unknown', deliveryReason = null, errorMessage = null } = {}) {
      return this.finalize({ errorMessage });
    }
  };
}

export async function executeMcpToolCall(request, dependencies) {
  const {
    initError,
    core,
    getLiveToolHandler,
    refreshToolRegistry,
    transportContext = null
  } = dependencies;

  const currentInitError = initError();
  if (currentInitError) {
    return buildInitializationPendingToolResult({
      server: core,
      initError: currentInitError,
      projectPath: core?.projectPath || null
    });
  }

  if (!core.initialized) {
    return buildInitializationPendingToolResult({
      server: core,
      projectPath: core?.projectPath || null
    });
  }

  const { name, arguments: args } = request.params;
  const handler = await getLiveToolHandler(name);

  if (!handler) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  core.refreshToolRegistry = refreshToolRegistry;
  const resultWithTelemetry = await executeToolCall(handler, name, core, args || {}, transportContext);
  const normalizedResult = name === 'mcp_omnysystem_get_folderization_snapshot'
    ? alignFolderizationSnapshotToolResult(resultWithTelemetry)
    : resultWithTelemetry;
  const paginatedResult = applyPagination(normalizedResult, args || {});

  return {
    content: [{ type: 'text', text: JSON.stringify(paginatedResult, null, 2) }]
  };
}

async function buildServerForSession({
  logger,
  getLiveToolDefinitions,
  executeMcpToolCall,
  getRuntimeResourceSnapshot,
  transportContext = null
}) {
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
    ReadResourceRequestSchema
  } = await import('@modelcontextprotocol/sdk/types.js');

  const RESOURCE_URIS = {
    status: 'omnysys://status',
    health: 'omnysys://health',
    sessions: 'omnysys://sessions',
    tools: 'omnysys://tools',
    schema: 'omnysys://schema'
  };

  function asJsonResource(uri, payload, meta = {}) {
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(payload, null, 2),
      _meta: meta
    };
  }

  const sessionServer = new Server(
    { name: 'omnysys', version: '3.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  sessionServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: await getLiveToolDefinitions()
  }));

  sessionServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: RESOURCE_URIS.status,
        name: 'status',
        title: 'OmnySys Status',
        description: 'Live runtime status, health, and readiness snapshot.',
        mimeType: 'application/json'
      },
      {
        uri: RESOURCE_URIS.health,
        name: 'health',
        title: 'OmnySys Health',
        description: 'Health and boot summary for the MCP daemon.',
        mimeType: 'application/json'
      },
      {
        uri: RESOURCE_URIS.sessions,
        name: 'sessions',
        title: 'MCP Sessions',
        description: 'Current session persistence and deduplication summary.',
        mimeType: 'application/json'
      },
      {
        uri: RESOURCE_URIS.tools,
        name: 'tools',
        title: 'MCP Tools',
        description: 'Current tool registry snapshot.',
        mimeType: 'application/json'
      },
      {
        uri: RESOURCE_URIS.schema,
        name: 'schema',
        title: 'OmnySys MCP Schema',
        description: 'Runtime MCP capability and resource schema summary.',
        mimeType: 'application/json'
      }
    ]
  }));

  sessionServer.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: []
  }));

  sessionServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (!getRuntimeResourceSnapshot) {
      throw new McpError(ErrorCode.InvalidParams, 'Resource snapshot provider not configured');
    }

    const snapshot = await getRuntimeResourceSnapshot();
    const uri = request.params.uri;

    if (uri === RESOURCE_URIS.status) {
      return {
        contents: [asJsonResource(uri, snapshot.status, { name: 'status', title: 'OmnySys Status', description: 'Live runtime status, health, and readiness snapshot.' })]
      };
    }

    if (uri === RESOURCE_URIS.health) {
      return {
        contents: [asJsonResource(uri, snapshot.health, { name: 'health', title: 'OmnySys Health', description: 'Health and boot summary for the MCP daemon.' })]
      };
    }

    if (uri === RESOURCE_URIS.sessions) {
      return {
        contents: [asJsonResource(uri, snapshot.sessions, { name: 'sessions', title: 'MCP Sessions', description: 'Current session persistence and deduplication summary.' })]
      };
    }

    if (uri === RESOURCE_URIS.tools) {
      return {
        contents: [asJsonResource(uri, snapshot.tools, { name: 'tools', title: 'MCP Tools', description: 'Current tool registry snapshot.' })]
      };
    }

    if (uri === RESOURCE_URIS.schema) {
      return {
        contents: [asJsonResource(uri, snapshot.schema, { name: 'schema', title: 'OmnySys MCP Schema', description: 'Runtime MCP capability and resource schema summary.' })]
      };
    }

    throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
  });

  sessionServer.setRequestHandler(CallToolRequestSchema, async (request) => (
    executeMcpToolCall(request, { transportContext })
  ));

  sessionServer.onerror = (error) => {
    logger.error(`[MCP Error] ${error?.message || error}`);
  };

  return sessionServer;
}

// Session recovery helpers
async function recoverPersistedSession(sessionId, sessions, sessionManager, buildSessionServer, buildSessionTransportContext, logger) {
  const persistedSession = await waitForPersistedSession(sessionManager, sessionId);
  if (!persistedSession) return null;

  logger.debug(`[SESSION_RECOVERY] Restoring session "${sessionId}" for persistent client.`);

  let sessionServer = null;
  let resolvedSessionId = sessionId;
  const transportContext = buildSessionTransportContext({
    clientInfo: persistedSession.client_info || {},
    metadata: {
      ...(persistedSession.session_metadata || {}),
      transport_origin: persistedSession.transport_origin || persistedSession.session_metadata?.transport_origin,
      transport_origin_source: persistedSession.session_metadata?.transport_origin_source || 'db-restore',
      transport_request_phase: 'http-recovered',
      transport_session_header_present: true,
      transport_session_state: 'persisted'
    },
    requestHeaders: {},
    sessionId,
    sessionKind: 'http-recovered'
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
    enableJsonResponse: true,
    eventStore: sharedEventStore,
    onsessioninitialized: (recoveredId) => {
      resolvedSessionId = recoveredId;
      sessions.set(recoveredId, { transport, server: sessionServer, transportContext });
      logger.info(`MCP HTTP session recovered: ${recoveredId}`);
    }
  });

  transport.onclose = async () => {
    const sid = resolvedSessionId;
    if (!sid) return;
    sessions.delete(sid);
    sessionManager.deleteSession(sid);
  };

  sessionServer = buildSessionServer(transportContext);
  await sessionServer.connect(transport);

  return { transport, sessionServer, resolvedSessionId, transportContext };
}

function handleStaleInitializeRecovery(sessionId, req, res, sessions, sessionManager, buildSessionServer, buildSessionTransportContext, logger) {
  if (shouldSkipStaleInitRecovery(sessionId)) {
    logger.debug(`[SESSION_RECOVERY] Skipping duplicate stale initialize recovery for sessionId "${sessionId}".`);
    res.status(404)
      .set('Mcp-Session-Expired', 'true')
      .json(buildJsonRpcErrorResponse({
        code: -32001,
        message: 'SESSION_EXPIRED: Re-initialize by sending a new POST /mcp without mcp-session-id.',
        id: req.body?.id ?? null,
        data: { reason: 'duplicate_stale_initialize' }
      }));
    return null;
  }

  logger.debug(`[SESSION_RECOVERY] Re-initializing from stale sessionId "${sessionId}" via initialize request.`);

  let sessionServer = null;
  let resolvedSessionId = null;
  const requestHeaders = req.headers || {};
  const clientInfo = {
    ...buildHttpTransportIdentityFromHeaders(requestHeaders),
    ...(req.body.params?.clientInfo && typeof req.body.params.clientInfo === 'object'
      ? req.body.params.clientInfo
      : {})
  };
  const transportContext = buildSessionTransportContext({
    clientInfo,
    metadata: {
      transport_origin: clientInfo.transport_origin,
      transport_origin_source: clientInfo.transport_origin_source,
      transport_request_phase: 'http-reinitialize',
      transport_session_header_present: true,
      transport_session_state: 'stale'
    },
    requestHeaders: req.headers || {},
    sessionId,
    sessionKind: 'http-reinitialize'
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
    enableJsonResponse: true,
    eventStore: sharedEventStore,
    onsessioninitialized: (newSessionId) => {
      resolvedSessionId = sessionManager.saveSession(newSessionId, clientInfo, {
        ...(transportContext.transport_metadata || {}),
        transport_origin: transportContext.transport_origin,
        transport_origin_source: transportContext.transport_origin_source,
        transport_request_phase: transportContext.transport_metadata?.transport_request_phase || 'http-reinitialize',
        transport_session_header_present: transportContext.transport_metadata?.transport_session_header_present ?? true,
        transport_session_state: transportContext.transport_metadata?.transport_session_state || 'stale'
      });
      sessions.set(resolvedSessionId, { transport, server: sessionServer, transportContext });
    }
  });

  transport.onclose = async () => {
    const sid = resolvedSessionId || transport.sessionId;
    if (!sid) return;
    sessions.delete(sid);
    sessionManager.deleteSession(sid);
  };

  sessionServer = buildSessionServer(transportContext);
  
  return { transport, sessionServer, resolvedSessionId, clientInfo, transportContext };
}

function handleNewSessionInit(req, res, sessions, sessionManager, buildSessionServer, buildSessionTransportContext, logger) {
  let sessionServer = null;
  let resolvedSessionId = null;

  const requestHeaders = req.headers || {};
  const clientInfo = {
    ...buildHttpTransportIdentityFromHeaders(requestHeaders),
    ...(req.body.params?.clientInfo && typeof req.body.params.clientInfo === 'object'
      ? req.body.params.clientInfo
      : {})
  };
  const transportContext = buildSessionTransportContext({
    clientInfo,
    metadata: {
      transport_origin: clientInfo?.transport_origin,
      transport_origin_source: clientInfo?.transport_origin_source,
      transport_request_phase: 'http-initialize',
      transport_session_header_present: false,
      transport_session_state: 'fresh'
    },
    requestHeaders,
    sessionId: null,
    sessionKind: 'http-initialize'
  });
  const clientId = clientInfo?.client_id || clientInfo?.original_client_id || clientInfo?.name || clientInfo?.original_name || 'unknown';
  const reservation = sessionManager.reserveSession(clientInfo, randomUUID());
  const sessionIdToUse = reservation.sessionId;
  const isNewSession = !reservation.reused;

  if (reservation.reused) {
    logger.debug(`[DEDUP] Reusing ${reservation.source} session ${sessionIdToUse} for client ${clientId}`);
  } else {
    logger.info(`[DEDUP] Creating new session ${sessionIdToUse} for client ${clientId}`);
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionIdToUse,
    enableJsonResponse: true,
    eventStore: sharedEventStore,
    onsessioninitialized: (newSessionId) => {
      resolvedSessionId = sessionManager.saveSession(newSessionId, clientInfo, {
        ...(transportContext.transport_metadata || {}),
        transport_origin: transportContext.transport_origin,
        transport_origin_source: transportContext.transport_origin_source,
        transport_request_phase: transportContext.transport_metadata?.transport_request_phase || 'http-initialize',
        transport_session_header_present: transportContext.transport_metadata?.transport_session_header_present ?? false,
        transport_session_state: transportContext.transport_metadata?.transport_session_state || 'fresh'
      });
      sessions.set(resolvedSessionId, { transport, server: sessionServer, transportContext });
      if (resolvedSessionId !== newSessionId) {
        sessions.delete(newSessionId);
        logger.debug(`[DEDUP] Session ${newSessionId} deduplicated to ${resolvedSessionId}`);
      }
      if (isNewSession) {
        logger.info(`MCP HTTP session initialized: ${resolvedSessionId} (client: ${clientId})`);
      } else {
        logger.debug(`MCP HTTP session initialized: ${resolvedSessionId} (client: ${clientId})`);
      }
    }
  });

  transport.onclose = async () => {
    const sid = resolvedSessionId || transport.sessionId;
    if (!sid) return;
    sessions.delete(sid);
    sessionManager.deleteSession(sid);
  };

  sessionServer = buildSessionServer(transportContext);

  return { transport, sessionServer, resolvedSessionId, sessionIdToUse, clientInfo, isNewSession, clientId, transportContext };
}

function sendSessionExpiredResponse(res, req, reason) {
  res.status(404)
    .set('Mcp-Session-Expired', 'true')
    .json(buildJsonRpcErrorResponse({
      code: -32001,
      message: 'SESSION_EXPIRED: Re-initialize by sending a new POST /mcp without mcp-session-id.',
      id: req.body?.id ?? null,
      data: { reason }
    }));
}

function sendBadRequestResponse(res, req) {
  res.status(400).json(buildJsonRpcErrorResponse({
    code: -32000,
    message: 'Bad Request: invalid or missing MCP session',
    id: req.body?.id ?? null
  }));
}

function sendInternalServerErrorResponse(res, req, logger, errorMsg) {
  logger.error(`Error handling MCP request: ${errorMsg}`);
  if (!res.headersSent) {
    res.status(500).json(buildJsonRpcErrorResponse({
      code: -32603,
      message: 'Internal server error'
    }));
  }
}

async function connectSessionWithRecovery(transport, sessionServer, sessionIdToUse, clientInfo, sessionManager) {
  try {
    await sessionServer.connect(transport);
  } catch (error) {
    sessionManager.releasePendingSession(sessionIdToUse, clientInfo);
    throw error;
  }
}

export async function handleMcpRequest(req, res, dependencies) {
  const {
    logger,
    sessions,
    buildSessionServer,
    getSessionManager,
    normalizeMcpRequestHeaders
  } = dependencies;

  const sessionManager = await getSessionManager().catch(() => null);
  let transport;
  let activeTransportContext = null;
  let requestDeliveryTracker = null;
  if (!sessionManager) {
    sendInternalServerErrorResponse(res, req, logger, 'Session manager unavailable');
    return;
  }
  try {
    const rawSessionId = req.headers['mcp-session-id'];
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

    if (sessionId && sessions.has(sessionId)) {
      const entry = sessions.get(sessionId);
      transport = entry.transport;
      activeTransportContext = entry.transportContext || buildSessionTransportContext({
        clientInfo: {},
        metadata: {
          transport_origin: entry.transportContext?.transport_origin,
          transport_origin_source: entry.transportContext?.transport_origin_source,
          transport_request_phase: entry.transportContext?.transport_request_phase || 'http-session',
          transport_session_header_present: entry.transportContext?.transport_session_header_present === true,
          transport_session_state: entry.transportContext?.transport_metadata?.transport_session_state || 'active'
        },
        requestHeaders: req.headers || {},
        sessionId,
        sessionKind: 'http-session'
      });
    } else if (sessionId && !sessions.has(sessionId)) {
      const isInitRequest = req.method === 'POST' && isInitializeRequest(req.body);
      const persistedSession = await waitForPersistedSession(sessionManager, sessionId);

      if (persistedSession) {
        const recovered = await recoverPersistedSession(sessionId, sessions, sessionManager, buildSessionServer, buildSessionTransportContext, logger);
        if (!recovered) {
          sendSessionExpiredResponse(res, req, 'session_recovery_failed');
          return;
        }
        transport = recovered.transport;
        activeTransportContext = recovered.transportContext || null;
      } else if (isInitRequest) {
        const result = handleStaleInitializeRecovery(sessionId, req, res, sessions, sessionManager, buildSessionServer, buildSessionTransportContext, logger);
        if (!result) return;
        transport = result.transport;
        activeTransportContext = result.transportContext || null;
        await connectSessionWithRecovery(result.transport, result.sessionServer, sessionId, req.body.params?.clientInfo, sessionManager);
      } else {
        logger.warn(`[SESSION_EXPIRED] sessionId="${sessionId}" not found. Client must re-initialize.`);
        sendSessionExpiredResponse(res, req, 'session_not_found');
        return;
      }
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      const result = handleNewSessionInit(req, res, sessions, sessionManager, buildSessionServer, buildSessionTransportContext, logger);
      transport = result.transport;
      activeTransportContext = result.transportContext || null;
      await connectSessionWithRecovery(result.transport, result.sessionServer, result.sessionIdToUse, result.clientInfo, sessionManager);
    } else {
      sendBadRequestResponse(res, req);
      return;
    }

    if (activeTransportContext && typeof activeTransportContext === 'object') {
      requestDeliveryTracker = createMcpRequestDeliveryTracker({
        transportContext: activeTransportContext,
        req,
        startedAt: new Date()
      });
      activeTransportContext.requestDeliveryTracker = requestDeliveryTracker;
      res.once('finish', () => {
        try {
          requestDeliveryTracker.markResponseFinished(res.statusCode);
        } catch {
          // best effort
        }
      });
      res.once('close', () => {
        try {
          requestDeliveryTracker.markResponseClosed();
        } catch {
          // best effort
        }
      });
    }

    if (typeof normalizeMcpRequestHeaders === 'function') {
      normalizeMcpRequestHeaders(req, logger);
    } else {
      logger?.debug?.('[MCP COMPAT] normalizeMcpRequestHeaders helper unavailable; continuing without header normalization.');
    }
    await transport.handleRequest(req, res, req.body);
    if (requestDeliveryTracker && (res.finished || res.writableEnded || res.headersSent)) {
      requestDeliveryTracker.markResponseFinished(res.statusCode);
    }
    if (requestDeliveryTracker && sessionManager?.db) {
      const deliveryEvent = requestDeliveryTracker.finalize({
        errorMessage: null
      });
      persistMcpRequestDeliveryTelemetry(sessionManager.db, deliveryEvent);
    }
  } catch (error) {
    if (requestDeliveryTracker && sessionManager?.db) {
      try {
        const deliveryEvent = requestDeliveryTracker.finalize({
          errorMessage: error.message || String(error)
        });
        persistMcpRequestDeliveryTelemetry(sessionManager.db, deliveryEvent);
      } catch {
        // best effort only
      }
    }
    sendInternalServerErrorResponse(res, req, logger, error.message);
  } finally {
    if (activeTransportContext && typeof activeTransportContext === 'object') {
      delete activeTransportContext.requestDeliveryTracker;
    }
  }
}
