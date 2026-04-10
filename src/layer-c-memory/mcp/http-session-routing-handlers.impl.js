import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { applyPagination } from './core/pagination.js';
import { executeToolCall } from './core/initialization/steps/mcp-tool-call-helpers.js';
import { buildInitializationPendingToolResult } from './core/initialization/progress-state.js';
import {
  buildJsonRpcErrorResponse
} from './http-session-routing-helpers.js';
import {
  buildTransportProvenance,
  inferTransportOrigin
} from './transport-provenance.js';

const SESSION_RECOVERY_ATTEMPTS = Number(process.env.OMNYSYS_SESSION_RECOVERY_ATTEMPTS || 20);
const SESSION_RECOVERY_DELAY_MS = Number(process.env.OMNYSYS_SESSION_RECOVERY_DELAY_MS || 250);
const sharedEventStore = new (await import('@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js')).InMemoryEventStore();
const staleInitRecoveryInFlight = new Set();

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
  sessionId = null,
  sessionKind = 'http'
} = {}) {
  const origin = inferTransportOrigin({
    clientInfo,
    metadata,
    requestContext: {
      defaultOrigin: 'native_mcp',
      isHttpRequest: true,
      transportMode: metadata.transport_origin === 'stdio_bridge' ? 'stdio' : 'http'
    }
  });

  return buildTransportProvenance({
    origin,
    source: metadata.transport_origin_source
      || clientInfo.transport_origin_source
      || (clientInfo.bridge_recovery ? 'bridge-recovery' : 'http-session'),
    clientInfo,
    metadata,
    sessionId,
    clientId: clientInfo?.client_id || clientInfo?.original_client_id || clientInfo?.name || clientInfo?.original_name || 'unknown',
    sessionKind
  });
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
  const paginatedResult = applyPagination(resultWithTelemetry, args || {});

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

  return { transport, sessionServer, resolvedSessionId };
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
  const clientInfo = req.body.params?.clientInfo || {};
  const transportContext = buildSessionTransportContext({
    clientInfo,
    metadata: {
      transport_origin: clientInfo.transport_origin,
      transport_origin_source: clientInfo.transport_origin_source,
      transport_request_phase: 'http-reinitialize',
      transport_session_header_present: true,
      transport_session_state: 'stale'
    },
    sessionId,
    sessionKind: 'http-reinitialize'
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
    enableJsonResponse: true,
    eventStore: sharedEventStore,
    onsessioninitialized: (newSessionId) => {
      resolvedSessionId = sessionManager.saveSession(newSessionId, req.body.params?.clientInfo, {
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
  
  return { transport, sessionServer, resolvedSessionId, clientInfo };
}

function handleNewSessionInit(req, res, sessions, sessionManager, buildSessionServer, buildSessionTransportContext, logger) {
  let sessionServer = null;
  let resolvedSessionId = null;

  const clientInfo = req.body.params?.clientInfo;
  const transportContext = buildSessionTransportContext({
    clientInfo,
    metadata: {
      transport_origin: clientInfo?.transport_origin,
      transport_origin_source: clientInfo?.transport_origin_source,
      transport_request_phase: 'http-initialize',
      transport_session_header_present: false,
      transport_session_state: 'fresh'
    },
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

  return { transport, sessionServer, resolvedSessionId, sessionIdToUse, clientInfo, isNewSession, clientId };
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

  let transport;
  try {
    const rawSessionId = req.headers['mcp-session-id'];
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId).transport;
    } else if (sessionId && !sessions.has(sessionId)) {
      const isInitRequest = req.method === 'POST' && isInitializeRequest(req.body);
      const sessionManager = await getSessionManager();
      const persistedSession = await waitForPersistedSession(sessionManager, sessionId);

      if (persistedSession) {
        const recovered = await recoverPersistedSession(sessionId, sessions, sessionManager, buildSessionServer, buildSessionTransportContext, logger);
        if (!recovered) {
          sendSessionExpiredResponse(res, req, 'session_recovery_failed');
          return;
        }
        transport = recovered.transport;
      } else if (isInitRequest) {
        const result = handleStaleInitializeRecovery(sessionId, req, res, sessions, sessionManager, buildSessionServer, buildSessionTransportContext, logger);
        if (!result) return;
        transport = result.transport;
        await connectSessionWithRecovery(result.transport, result.sessionServer, sessionId, req.body.params?.clientInfo, sessionManager);
      } else {
        logger.warn(`[SESSION_EXPIRED] sessionId="${sessionId}" not found. Client must re-initialize.`);
        sendSessionExpiredResponse(res, req, 'session_not_found');
        return;
      }
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      const sessionManager = await getSessionManager();
      const result = handleNewSessionInit(req, res, sessions, sessionManager, buildSessionServer, buildSessionTransportContext, logger);
      transport = result.transport;
      await connectSessionWithRecovery(result.transport, result.sessionServer, result.sessionIdToUse, result.clientInfo, sessionManager);
    } else {
      sendBadRequestResponse(res, req);
      return;
    }

    if (typeof normalizeMcpRequestHeaders === 'function') {
      normalizeMcpRequestHeaders(req, logger);
    } else {
      logger?.debug?.('[MCP COMPAT] normalizeMcpRequestHeaders helper unavailable; continuing without header normalization.');
    }
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    sendInternalServerErrorResponse(res, req, logger, error.message);
  }
}
