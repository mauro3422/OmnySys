#!/usr/bin/env node

/**
 * OmnySys MCP HTTP Daemon (Streamable HTTP)
 *
 * Single shared backend for multiple IDE extensions/clients.
 * - MCP endpoint:    POST/GET/DELETE /mcp (and alias /)
 * - Health endpoint: GET /health
 * - Legacy tools:    GET /tools
 *//* =========================================================================
* CRITICAL AI AGENT WARNING
* DO NOT ATTEMPT TO RUN `npm run mcp` OR `omny up` USING TERMINAL COMMANDS
* (run_command) IN THE BACKGROUND.
*
* This server is managed exclusively by the VSCode MCP client / IDE plugin.
* If an agent spawns this via a detached process or terminal, it will hijack
* port 9999 and the IDE will lose the socket connection permanently (EOF).
*
* CORRECT WAY TO RESTART: Use the `mcp_omnysystem_restart_server` MCP tool.
* This safely refreshes the internal components and RAM without killing the
* underlying process or dropping the IDE sockets.
* ========================================================================= */

import v8 from 'v8';
import { spawn } from 'child_process';

const heapLimitMB = v8.getHeapStatistics().heap_size_limit / 1024 / 1024;
const hasMaxOldSpace = process.env.NODE_OPTIONS && process.env.NODE_OPTIONS.includes('max-old-space-size');

if (!hasMaxOldSpace && heapLimitMB < 7000) {
  console.log(sanitizeLogText(`\n[OmnySys:Boot] Strict RAM limit detected (Current Heap: ${Math.round(heapLimitMB)} MB).`));
  console.log(sanitizeLogText('[OmnySys:Boot] Auto-configuring environment to 8GB RAM for Turbo Parser...'));

  const env = { ...process.env };
  env.NODE_OPTIONS = `${env.NODE_OPTIONS || ''} --max-old-space-size=8192`.trim();

  const child = spawn(process.execPath, process.argv.slice(1), {
    stdio: 'inherit',
    env
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });

  await new Promise(() => { });
}

import path from 'path';
import express from 'express';
import { OmnySysMCPServer } from './mcp/core/server-class.js';
import { createLogger, sanitizeLogText } from '../utils/logger.js';
import { handleRuntimeRestart } from './mcp/restart-runtime.js';
import { startHttpServer } from './mcp-http-listener.js';
import {
  buildServerForSession,
  createConditionalJsonMiddleware,
  executeMcpToolCall,
  handleMcpRequest
} from './mcp-http-session-routing.js';
import { buildInventoryReport, buildInventorySnapshot } from './mcp/tools/list-tools.js';

const logger = createLogger('OmnySys:mcp:http');

async function loadToolRegistryRuntime() {
  return import('./mcp/tool-registry-runtime.js');
}

async function refreshLiveToolRegistry(activeLogger = logger) {
  const { refreshToolRegistry } = await loadToolRegistryRuntime();
  return refreshToolRegistry(activeLogger);
}

async function getLiveToolDefinitions() {
  const { getLiveDefinitions } = await loadToolRegistryRuntime();
  return getLiveDefinitions();
}

async function getLiveToolHandler(name) {
  const { getLiveHandlers } = await loadToolRegistryRuntime();
  return getLiveHandlers()[name];
}

async function getRuntimeResourceSnapshot() {
  let sessionManager = null;
  try {
    sessionManager = await getSessionManager();
  } catch {
    sessionManager = null;
  }

  const toolInventory = buildInventorySnapshot({ includeSchemas: true });
  const toolInventoryReport = buildInventoryReport(toolInventory);
  const runtimeSessions = sessionManager?.getAllSessions?.(true) || [];
  const allSessions = sessionManager?.getAllSessions?.(false) || [];
  const dedupStats = sessionManager?.getDedupStats?.() || null;

  let background = null;
  try {
    const { getRepository } = await import('./storage/repository/index.js');
    const repo = getRepository(projectPath);
    const db = repo?.db || null;
    if (db) {
      background = {
        phase2PendingFiles: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 0').get()?.n || 0,
        societiesCount: db.prepare('SELECT COUNT(*) as n FROM societies').get()?.n || 0,
        phase2: core.orchestrator?.phase2Status || null
      };
    }
  } catch {
    background = null;
  }

  const health = buildHealthSnapshot({
    initialized: core.initialized,
    initError,
    projectPath,
    sessionCount: sessions.size,
    background
  });

  const sessionSummary = {
    runtimeSessions: sessions.size,
    persistedActiveSessions: runtimeSessions.length,
    persistedTotalSessions: allSessions.length,
    dedupStats
  };

  return {
    status: {
      ...health,
      phase2: core.orchestrator?.phase2Status || null,
      sessionSummary,
      toolInventory: {
        totalTools: toolInventory.summary.totalTools,
        categories: toolInventory.summary.categories
      }
    },
    health,
    sessions: sessionSummary,
    tools: {
      snapshot: toolInventory,
      report: toolInventoryReport
    },
    schema: {
      protocol: '2025-11-25',
      server: {
        name: 'omnysys',
        version: '3.0.0',
        transport: 'streamable-http'
      },
      capabilities: {
        tools: true,
        resources: true
      },
      resources: [
        'omnysys://status',
        'omnysys://health',
        'omnysys://sessions',
        'omnysys://tools',
        'omnysys://schema'
      ],
      toolInventory: {
        totalTools: toolInventory.summary.totalTools,
        categories: toolInventory.summary.categories,
        report: toolInventoryReport
      },
      sessionSummary
    }
  };
}

export function buildHealthSnapshot({
  initialized = false,
  initError = null,
  projectPath,
  sessionCount = 0,
  background = null
} = {}) {
  return {
    status: initError ? 'degraded' : (initialized ? 'healthy' : 'starting'),
    ready: Boolean(initialized && !initError),
    service: 'omnysys-mcp-http',
    initialized: Boolean(initialized),
    projectPath,
    sessions: sessionCount ?? 0,
    background,
    transport: 'streamable-http',
    error: initError?.message || null
  };
}

await refreshLiveToolRegistry(logger);

const arg1 = process.argv[2];
const arg2 = process.argv[3];
const parsedArg1AsPort = Number(arg1);
const arg1IsPort = Number.isFinite(parsedArg1AsPort) && parsedArg1AsPort > 0;

const projectPath = path.resolve(arg1IsPort ? process.cwd() : (arg1 || process.cwd()));
const port = Number(process.env.OMNYSYS_MCP_PORT || (arg1IsPort ? arg1 : arg2) || 9999);
const host = process.env.OMNYSYS_MCP_HOST || '127.0.0.1';

const app = express();
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function sendUtf8Json(body) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson(body);
  };
  next();
});

const sessions = new Map();
const core = new OmnySysMCPServer(projectPath);
core.sessions = sessions;
let initError = null;
let shutdownInProgress = false;

const executeLiveMcpToolCall = (request) => executeMcpToolCall(request, {
  initError: () => initError,
  core,
  projectPath,
  getLiveToolHandler,
  refreshToolRegistry: refreshLiveToolRegistry
});

const buildSessionServer = () => buildServerForSession({
  logger,
  getLiveToolDefinitions,
  executeMcpToolCall: executeLiveMcpToolCall,
  getRuntimeResourceSnapshot
});

const getSessionManager = async () => {
  const { sessionManager } = await import('./mcp/core/session-manager.js');
  sessionManager.ensureInitialized();
  return sessionManager;
};

const conditionalJson = createConditionalJsonMiddleware(logger);
const handleHttpMcpRequest = (req, res) => handleMcpRequest(req, res, {
  logger,
  sessions,
  buildSessionServer,
  getSessionManager
});

app.all('/mcp', conditionalJson, handleHttpMcpRequest);
app.all('/', conditionalJson, handleHttpMcpRequest);

app.get('/health', async (req, res) => {
  let background = null;
  try {
    const { getRepository } = await import('./storage/repository/index.js');
    const repo = getRepository(projectPath);
    const db = repo?.db || null;
    if (db) {
      background = {
        phase2PendingFiles: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 0').get()?.n || 0,
        societiesCount: db.prepare('SELECT COUNT(*) as n FROM societies').get()?.n || 0,
        phase2: core.orchestrator?.phase2Status || null
      };
    }
  } catch {
    background = null;
  }

  res.json(buildHealthSnapshot({
    initialized: core.initialized,
    initError,
    projectPath,
    sessionCount: sessions.size,
    background
  }));
});

app.get('/tools', async (req, res) => {
  try {
    const includeSchemas = String(req.query?.includeSchemas ?? 'true').toLowerCase() !== 'false';
    const definitions = await getLiveToolDefinitions();
    const tools = definitions.map((tool) => includeSchemas
      ? tool
      : { name: tool.name, description: tool.description });
    res.json({
      count: tools.length,
      includeSchemas,
      tools
    });
  } catch (error) {
    logger.error(`Error loading tool definitions: ${error.message}`);
    res.status(500).json({ error: 'Unable to load tool definitions' });
  }
});

app.post('/restart', express.json(), async (req, res) => {
  try {
    const result = await handleRuntimeRestart(req.body || {}, {
      server: core,
      cache: core.cache,
      orchestrator: core.orchestrator,
      refreshToolRegistry: refreshLiveToolRegistry
    });
    res.json(result);
  } catch (error) {
    logger.error(`Error in /restart endpoint: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, _next) => {
  logger.error(`Unhandled error in ${req.method} ${req.path}: ${err.message}`);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

const httpServer = await startHttpServer({
  app,
  host,
  port,
  logger,
  isProxyMode: process.env.OMNYSYS_PROXY_MODE === '1'
});
logger.info(`Project: ${projectPath}`);

core.initialize().then(async () => {
  try {
    const sessionManager = await getSessionManager();
    sessionManager.cleanup(48);
  } catch (error) {
    logger.warn(`SessionManager initialization failed: ${error.message}`);
  }
}).catch((error) => {
  initError = error;
  logger.error(`Core initialization failed: ${error.message}`);
});

async function gracefulHttpShutdown() {
  if (shutdownInProgress) {
    return;
  }

  shutdownInProgress = true;

  for (const [sid, session] of sessions.entries()) {
    try {
      await session.server?.close();
    } catch {
      // Best effort on shutdown.
    }
    sessions.delete(sid);
  }

  await core.shutdown().catch(() => { });

  if (httpServer?.close) {
    await new Promise((resolve) => {
      httpServer.close(() => resolve());
    });
  }

  process.exit(0);
}

process.once('SIGINT', gracefulHttpShutdown);
process.once('SIGTERM', gracefulHttpShutdown);
