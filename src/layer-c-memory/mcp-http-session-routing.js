import { randomUUID } from 'crypto';
import express from 'express';
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
    recentErrors = normalizeRecentNotifications(await collectRecentNotifications(projectPath, {
      clearLoggerBuffer: true,
      watcherLimit: 10,
      server: core
    }));
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
      const persistedSession = sessionManager.getSession(sessionId);

      if (persistedSession) {
        logger.debug(`[SESSION_RECOVERY] Restoring session "${sessionId}" for persistent client.`);

        let sessionServer = null;
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId,
          onsessioninitialized: (recoveredId) => {
            sessions.set(recoveredId, { transport, server: sessionServer });
            logger.info(`MCP HTTP session recovered: ${recoveredId}`);
          }
        });

        transport.onclose = async () => {
          const sid = transport.sessionId;
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
          .json({
            jsonrpc: '2.0',
            error: {
              code: -32001,
              message: 'SESSION_EXPIRED: Re-initialize by sending a new POST /mcp without mcp-session-id.',
              data: { reason: 'session_not_found' }
            },
            id: req.body?.id ?? null
          });
        return;
      }
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      const sessionManager = await getSessionManager();
      let sessionServer = null;

      const clientInfo = req.body.params?.clientInfo;
      const clientId = clientInfo?.name || clientInfo?.client_id || 'unknown';
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
          sessions.set(newSessionId, { transport, server: sessionServer });
          const savedId = sessionManager.saveSession(newSessionId, clientInfo, {});
          if (savedId !== newSessionId) {
            sessions.delete(newSessionId);
            sessions.set(savedId, { transport, server: sessionServer });
            logger.debug(`[DEDUP] Session ${newSessionId} deduplicated to ${savedId}`);
          }
          if (isNewSession) {
            logger.info(`MCP HTTP session initialized: ${newSessionId} (client: ${clientId})`);
          } else {
            logger.debug(`MCP HTTP session initialized: ${newSessionId} (client: ${clientId})`);
          }
        }
      });

      transport.onclose = async () => {
        const sid = transport.sessionId;
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
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: invalid or missing MCP session'
        },
        id: null
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error(`Error handling MCP request: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
}

export function createConditionalJsonMiddleware(logger) {
  return (req, res, next) => {
    if (req.headers['mcp-session-id']) {
      return next();
    }

    express.json()(req, res, (err) => {
      if (!err) return next();

      logger.warn(`[MCP JSON PARSE] ${req.method} ${req.path}: ${err.message}`);
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error: invalid JSON payload'
        },
        id: null
      });
    });
  };
}
