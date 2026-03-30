import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
  isInitializeRequest
} from '@modelcontextprotocol/sdk/types.js';
import { applyPagination } from './mcp/core/pagination.js';
import { compactRecentNotifications } from './mcp/core/recent-notifications.js';
import { createConditionalJsonMiddleware as createConditionalJsonMiddlewareImpl } from './mcp/http-session-routing-helpers.js';

const SESSION_RECOVERY_ATTEMPTS = Number(process.env.OMNYSYS_SESSION_RECOVERY_ATTEMPTS || 20);
const SESSION_RECOVERY_DELAY_MS = Number(process.env.OMNYSYS_SESSION_RECOVERY_DELAY_MS || 250);
const MCP_POST_ACCEPT_TYPES = ['application/json', 'text/event-stream'];
const MCP_GET_ACCEPT_TYPES = ['text/event-stream'];
const sharedEventStore = new InMemoryEventStore();

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

export function buildJsonRpcErrorResponse({ code, message, id = null, data } = {}) {
  const response = {
    jsonrpc: '2.0',
    error: {
      code,
      message
    },
    id
  };

  if (data !== undefined) {
    response.error.data = data;
  }

  return response;
}

export function createConditionalJsonMiddleware(logger) {
  return createConditionalJsonMiddlewareImpl(logger, buildJsonRpcErrorResponse);
}

function mergeAcceptHeader(currentValue, requiredTypes) {
  const normalized = String(currentValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const seen = new Set(normalized.map((value) => value.toLowerCase()));
  for (const requiredType of requiredTypes) {
    if (!seen.has(requiredType)) {
      normalized.push(requiredType);
      seen.add(requiredType);
    }
  }

  return normalized.join(', ');
}

function applyNodeHeaderOverride(req, headerName, headerValue) {
  if (!req?.headers) {
    return;
  }

  const normalizedHeaderName = headerName.toLowerCase();
  req.headers[normalizedHeaderName] = headerValue;

  if (req.headersDistinct && typeof req.headersDistinct === 'object') {
    req.headersDistinct[normalizedHeaderName] = [headerValue];
  }

  if (!Array.isArray(req.rawHeaders)) {
    return;
  }

  let replaced = false;
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    if (String(req.rawHeaders[index] || '').toLowerCase() === normalizedHeaderName) {
      req.rawHeaders[index + 1] = headerValue;
      replaced = true;
    }
  }

  if (!replaced) {
    req.rawHeaders.push(headerName, headerValue);
  }
}

export function normalizeMcpRequestHeaders(req, logger) {
  if (!req?.headers) {
    return;
  }

  const method = String(req.method || '').toUpperCase();
  const requiredTypes = method === 'POST'
    ? MCP_POST_ACCEPT_TYPES
    : method === 'GET'
      ? MCP_GET_ACCEPT_TYPES
      : null;

  if (!requiredTypes) {
    return;
  }

  const headerName = Object.keys(req.headers).find((name) => name.toLowerCase() === 'accept') || 'accept';
  const originalValue = req.headers[headerName];
  const normalizedValue = mergeAcceptHeader(originalValue, requiredTypes);

  if (normalizedValue && normalizedValue !== originalValue) {
    applyNodeHeaderOverride(req, headerName, normalizedValue);
    logger?.debug?.(`[MCP COMPAT] Normalized Accept header for ${method} ${req.path || '/mcp'} -> ${normalizedValue}`);
  }
}

export function buildServerForSession({
  logger,
  getLiveToolDefinitions,
  executeMcpToolCall,
  getRuntimeResourceSnapshot
}) {
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
        contents: [asJsonResource(
          uri,
          snapshot.status,
          {
            name: 'status',
            title: 'OmnySys Status',
            description: 'Live runtime status, health, and readiness snapshot.'
          }
        )]
      };
    }

    if (uri === RESOURCE_URIS.health) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.health,
          {
            name: 'health',
            title: 'OmnySys Health',
            description: 'Health and boot summary for the MCP daemon.'
          }
        )]
      };
    }

    if (uri === RESOURCE_URIS.sessions) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.sessions,
          {
            name: 'sessions',
            title: 'MCP Sessions',
            description: 'Current session persistence and deduplication summary.'
          }
        )]
      };
    }

    if (uri === RESOURCE_URIS.tools) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.tools,
          {
            name: 'tools',
            title: 'MCP Tools',
            description: 'Current tool registry snapshot.'
          }
        )]
      };
    }

    if (uri === RESOURCE_URIS.schema) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.schema,
          {
            name: 'schema',
            title: 'OmnySys MCP Schema',
            description: 'Runtime MCP capability and resource schema summary.'
          }
        )]
      };
    }

    throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
  });

  sessionServer.setRequestHandler(CallToolRequestSchema, async (request) => (
    executeMcpToolCall(request)
  ));

  sessionServer.onerror = (error) => {
    logger.error(`[MCP Error] ${error?.message || error}`);
  };

  return sessionServer;
}

export async function executeMcpToolCall(request, dependencies) {
  const {
    initError,
    core,
    projectPath,
    getLiveToolHandler,
    refreshToolRegistry
  } = dependencies;

  const currentInitError = initError();
  if (currentInitError) {
    return {
      content: [{ type: 'text', text: `OmnySys initialization failed: ${currentInitError.message}` }]
    };
  }

  if (!core.initialized) {
    return {
      content: [{ type: 'text', text: 'OmnySys is initializing. Retry in a few seconds.' }]
    };
  }

  const { name, arguments: args } = request.params;
  const handler = await getLiveToolHandler(name);

  if (!handler) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  const context = {
    orchestrator: core.orchestrator,
    cache: core.cache,
    projectPath: core.projectPath,
    server: core,
    refreshToolRegistry
  };

  const rawResult = await handler(args, context);

  let recentErrors = { count: 0, warnings: 0, errors: 0, logs: [], watcherAlerts: [] };
  try {
    const { collectRecentNotifications, normalizeRecentNotifications } = await import('./mcp/core/recent-notifications.js');
    const collectedRecentErrors = normalizeRecentNotifications(await collectRecentNotifications(projectPath, {
      clearLoggerBuffer: true,
      watcherLimit: 10,
      server: core
    }));
    recentErrors = compactRecentNotifications(collectedRecentErrors, {
      maxLogs: 3,
      maxWatcherAlerts: 3
    });
  } catch {
    // Optional logger extensions not available in all environments.
  }

  const resultWithErrors = recentErrors.count > 0
    ? { _recentErrors: recentErrors, ...rawResult }
    : rawResult;

  const paginatedResult = applyPagination(resultWithErrors, args || {});

  return {
    content: [{ type: 'text', text: JSON.stringify(paginatedResult, null, 2) }]
  };
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

export async function handleMcpRequest(req, res, dependencies) {
  const {
    logger,
    sessions,
    buildSessionServer,
    getSessionManager
  } = dependencies;

  let transport;
  try {
    const rawSessionId = req.headers['mcp-session-id'];
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId).transport;
    } else if (sessionId && !sessions.has(sessionId)) {
      const sessionManager = await getSessionManager();
      const persistedSession = await waitForPersistedSession(sessionManager, sessionId);

      if (persistedSession) {
        logger.debug(`[SESSION_RECOVERY] Restoring session "${sessionId}" for persistent client.`);

        let sessionServer = null;
        let resolvedSessionId = sessionId;
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId,
          enableJsonResponse: true,
          eventStore: sharedEventStore,
          onsessioninitialized: (recoveredId) => {
            resolvedSessionId = recoveredId;
            sessions.set(recoveredId, { transport, server: sessionServer });
            logger.info(`MCP HTTP session recovered: ${recoveredId}`);
          }
        });

        transport.onclose = async () => {
          const sid = resolvedSessionId;
          if (!sid) return;
          sessions.delete(sid);
          sessionManager.deleteSession(sid);
        };

        sessionServer = buildSessionServer();
        await sessionServer.connect(transport);
      } else {
        logger.warn(`[SESSION_EXPIRED] sessionId="${sessionId}" not found. Client must re-initialize.`);
        res.status(404)
          .set('Mcp-Session-Expired', 'true')
          .json(buildJsonRpcErrorResponse({
            code: -32001,
            message: 'SESSION_EXPIRED: Re-initialize by sending a new POST /mcp without mcp-session-id.',
            id: req.body?.id ?? null,
            data: { reason: 'session_not_found' }
          }));
        return;
      }
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      const sessionManager = await getSessionManager();
      let sessionServer = null;
      let resolvedSessionId = null;

      const clientInfo = req.body.params?.clientInfo;
      const clientId = clientInfo?.client_id || clientInfo?.original_client_id || clientInfo?.name || clientInfo?.original_name || 'unknown';
      const reservation = sessionManager.reserveSession(clientInfo, randomUUID());
      const sessionIdToUse = reservation.sessionId;
      const isNewSession = !reservation.reused;

      if (reservation.reused) {
        logger.debug(`[DEDUP] Reusing ${reservation.source} session ${sessionIdToUse} for client ${clientId}`);
      } else {
        logger.info(`[DEDUP] Creating new session ${sessionIdToUse} for client ${clientId}`);
      }

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionIdToUse,
        enableJsonResponse: true,
        eventStore: sharedEventStore,
        onsessioninitialized: (newSessionId) => {
          resolvedSessionId = sessionManager.saveSession(newSessionId, clientInfo, {});
          sessions.set(resolvedSessionId, { transport, server: sessionServer });
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

      sessionServer = buildSessionServer();
      try {
        await sessionServer.connect(transport);
      } catch (error) {
        sessionManager.releasePendingSession(sessionIdToUse, clientInfo);
        throw error;
      }
    } else {
      res.status(400).json(buildJsonRpcErrorResponse({
        code: -32000,
        message: 'Bad Request: invalid or missing MCP session',
        id: req.body?.id ?? null
      }));
      return;
    }

    normalizeMcpRequestHeaders(req, logger);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error(`Error handling MCP request: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json(buildJsonRpcErrorResponse({
        code: -32603,
        message: 'Internal server error'
      }));
    }
  }
}
