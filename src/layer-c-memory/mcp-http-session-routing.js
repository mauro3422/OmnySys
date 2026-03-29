import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ErrorCode,
  McpError,
  isInitializeRequest
} from '@modelcontextprotocol/sdk/types.js';
import { applyPagination } from './mcp/core/pagination.js';
import { compactRecentNotifications } from './mcp/core/recent-notifications.js';
import { createConditionalJsonMiddleware as createConditionalJsonMiddlewareImpl } from './mcp/http-session-routing-helpers.js';

const SESSION_RECOVERY_ATTEMPTS = Number(process.env.OMNYSYS_SESSION_RECOVERY_ATTEMPTS || 20);
const SESSION_RECOVERY_DELAY_MS = Number(process.env.OMNYSYS_SESSION_RECOVERY_DELAY_MS || 250);

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

export function buildServerForSession({ logger, getLiveToolDefinitions, executeMcpToolCall }) {
  const sessionServer = new Server(
    { name: 'omnysys', version: '3.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  sessionServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: await getLiveToolDefinitions()
  }));

  sessionServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: []
  }));

  sessionServer.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: []
  }));

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
