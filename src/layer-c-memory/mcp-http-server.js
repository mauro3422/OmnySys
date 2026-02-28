#!/usr/bin/env node

/**
 * OmnySys MCP HTTP Daemon (Streamable HTTP)
 *
 * Single shared backend for multiple IDE extensions/clients.
 * - MCP endpoint:    POST/GET/DELETE /mcp (and alias /)
 * - Health endpoint: GET /health
 * - Legacy tools:    GET /tools
 */

import path from 'path';
import { randomUUID } from 'crypto';
import express from 'express';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
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
import { OmnySysMCPServer } from './mcp/core/server-class.js';
import { pathToFileURL } from 'url';
import { applyPagination } from './mcp/core/pagination.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:mcp:http');

// ── Mutable tool registry ────────────────────────────────────────────────────
// Tools are loaded dynamically so that hot-reload and component restart
// can refresh handlers without killing the process.
const TOOLS_INDEX_PATH = new URL('./mcp/tools/index.js', import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, '$1'); // strip leading / on Windows paths

function toFileUrl(p) {
  return pathToFileURL(p).href;
}

const toolRegistry = { definitions: [], handlers: {} };

/**
 * Returns the live toolHandlers map. Always use this instead of the
 * static import so hot-reloads are reflected immediately.
 */
export function getLiveHandlers() { return toolRegistry.handlers; }
export function getLiveDefinitions() { return toolRegistry.definitions; }

/**
 * Re-imports tools/index.js with a cache-busting query param,
 * then updates the mutable registry in-place.
 * @returns {Promise<void>}
 */
export async function refreshToolRegistry() {
  try {
    const url = `${toFileUrl(TOOLS_INDEX_PATH)}?bust=${Date.now()}`;
    const mod = await import(url);
    toolRegistry.definitions = mod.toolDefinitions || [];
    toolRegistry.handlers = mod.toolHandlers || {};
    logger.info(`🔄 Tool registry refreshed (${toolRegistry.definitions.length} tools)`);
  } catch (err) {
    logger.error(`❌ Failed to refresh tool registry: ${err.message}`);
  }
}

// Initial load (after logger is ready)
await refreshToolRegistry();


const arg1 = process.argv[2];
const arg2 = process.argv[3];

const parsedArg1AsPort = Number(arg1);
const arg1IsPort = Number.isFinite(parsedArg1AsPort) && parsedArg1AsPort > 0;

const projectPath = path.resolve(arg1IsPort ? process.cwd() : (arg1 || process.cwd()));
const port = Number(process.env.OMNYSYS_MCP_PORT || (arg1IsPort ? arg1 : arg2) || 9999);
const host = process.env.OMNYSYS_MCP_HOST || '127.0.0.1';

const app = createMcpExpressApp({ host });
const sessions = new Map();

const core = new OmnySysMCPServer(projectPath);
let initError = null;

function buildServerForSession() {
  const sessionServer = new Server(
    { name: 'omnysys', version: '3.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  sessionServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getLiveDefinitions()
  }));

  // Codex/Cline may probe these even if OmnySys does not expose resources.
  sessionServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: []
  }));

  sessionServer.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: []
  }));

  sessionServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request);
  });

  sessionServer.onerror = (error) => {
    logger.error(`[MCP Error] ${error?.message || error}`);
  };

  return sessionServer;
}

async function handleToolCall(request) {
  if (initError) {
    return {
      content: [{ type: 'text', text: `❌ OmnySys initialization failed: ${initError.message}` }]
    };
  }

  if (!core.initialized) {
    return {
      content: [{ type: 'text', text: '⏳ OmnySys is initializing. Retry in a few seconds.' }]
    };
  }

  const { name, arguments: args } = request.params;
  const handler = getLiveHandlers()[name];

  if (!handler) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  const context = {
    orchestrator: core.orchestrator,
    cache: core.cache,
    projectPath: core.projectPath,
    server: core
  };

  const rawResult = await handler(args, context);

  let recentErrors = { count: 0, warnings: 0, errors: 0, logs: [] };
  try {
    const { getRecentLogs, clearRecentLogs } = await import('#utils/logger.js');
    const logs = getRecentLogs();
    recentErrors = {
      count: logs.length,
      warnings: logs.filter(l => l.level === 'warn').length,
      errors: logs.filter(l => l.level === 'error').length,
      logs: logs.map(l => ({
        level: l.level,
        message: l.message,
        time: new Date(l.time).toISOString()
      }))
    };
    clearRecentLogs();
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

async function handleMcpRequest(req, res) {
  try {
    const rawSessionId = req.headers['mcp-session-id'];
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

    let transport;

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId).transport;
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      let sessionServer = null;

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          sessions.set(newSessionId, { transport, server: sessionServer });
          logger.info(`MCP HTTP session initialized: ${newSessionId}`);
        }
      });

      transport.onclose = async () => {
        const sid = transport.sessionId;
        if (!sid) return;
        // Important: do NOT close the session server here.
        // server.close() triggers transport.close(), which triggers onclose again.
        // That creates a recursive close loop (RangeError: max call stack).
        sessions.delete(sid);
      };

      sessionServer = buildServerForSession();
      await sessionServer.connect(transport);
    } else if (sessionId && !sessions.has(sessionId)) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Session not found'
        },
        id: null
      });
      return;
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

app.all('/mcp', handleMcpRequest);
app.all('/', handleMcpRequest);

app.get('/health', (req, res) => {
  res.json({
    status: initError ? 'degraded' : (core.initialized ? 'healthy' : 'starting'),
    service: 'omnysys-mcp-http',
    initialized: core.initialized,
    projectPath,
    sessions: sessions.size,
    transport: 'streamable-http',
    error: initError?.message || null
  });
});

app.get('/tools', (req, res) => {
  const defs = getLiveDefinitions();
  res.json({
    count: defs.length,
    tools: defs.map(t => ({ name: t.name, description: t.description }))
  });
});

app.post('/restart', express.json(), async (req, res) => {
  try {
    const { restart_server } = await import('./mcp/tools/restart-server.js');
    const params = req.body || {};
    const result = await restart_server(params, {
      server: core,
      cache: core.cache,
      orchestrator: core.orchestrator
    });
    res.json(result);
  } catch (err) {
    logger.error(`Error in /restart endpoint: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

const httpServer = app.listen(port, host, () => {
  logger.info(`🌐 OmnySys MCP HTTP daemon listening on http://${host}:${port}/mcp`);
  logger.info(`📂 Project: ${projectPath}`);
});

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.warn(`Port ${port} already in use, assuming MCP daemon is already running.`);
    process.exit(0);
  }
  logger.error(`HTTP daemon startup failed: ${error.message}`);
  process.exit(1);
});

core.initialize().catch((error) => {
  initError = error;
  logger.error(`Core initialization failed: ${error.message}`);
});

async function shutdown() {
  for (const [sid, session] of sessions.entries()) {
    try {
      await session.server?.close();
    } catch {
      // Best effort on shutdown.
    }
    sessions.delete(sid);
  }

  await core.shutdown().catch(() => { });

  await new Promise((resolve) => {
    httpServer.close(() => resolve());
  });

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
