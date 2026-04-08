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
import fs from 'fs';
import { spawn } from 'child_process';
import { sanitizeLogText } from '../utils/logger.js';

function appendWorkerCrashTrace(kind, message, stack = '') {
  try {
    const tracePath = `${process.cwd()}\\logs\\mcp-worker-crash-trace.log`;
    fs.mkdirSync(`${process.cwd()}\\logs`, { recursive: true });
    fs.appendFileSync(
      tracePath,
      `${new Date().toISOString()} [${kind}] ${message}\n${stack ? `${stack}\n` : ''}\n`
    );
  } catch {
    // Best effort only.
  }
}

// CRITICAL: Register error handlers BEFORE any async code runs
// This catches errors that occur during module evaluation / startup
process.on('uncaughtException', (error) => {
  const msg = `[WORKER UNCAUGHT EXCEPTION] ${error.message}\n${error.stack || ''}`;
  process.stderr.write(msg + '\n');
  appendWorkerCrashTrace('uncaughtException', error.message || 'unknown', error.stack || '');
  // Don't exit immediately — let proxy handle the restart
});

process.on('unhandledRejection', (reason) => {
  const msg = `[WORKER UNHANDLED REJECTION] ${reason?.message || reason?.stack || String(reason)}`;
  process.stderr.write(msg + '\n');
  appendWorkerCrashTrace(
    'unhandledRejection',
    reason?.message || String(reason || 'unknown'),
    reason?.stack || ''
  );
});

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
import { createLogger } from '../utils/logger.js';
import { handleRuntimeRestart } from './mcp/restart-runtime.js';
import { startHttpServer } from './mcp-http-listener.js';
import {
  buildServerForSession,
  createConditionalJsonMiddleware,
  executeMcpToolCall,
  handleMcpRequest,
  normalizeMcpRequestHeaders
} from './mcp-http-session-routing.js';
import { buildInventoryReport, buildInventorySnapshot } from './mcp/tools/list-tools.js';
import { handleHealthApiRequest } from './mcp/api/health.js';

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
  const transportOriginCounts = runtimeSessions.reduce((acc, session) => {
    const origin = String(
      session?.transport_origin
      || session?.session_metadata?.transport_origin
      || session?.session_metadata?.transportOrigin
      || session?.client_info?.transport_origin
      || 'unknown'
    ).trim() || 'unknown';
    acc[origin] = (acc[origin] || 0) + 1;
    return acc;
  }, {});

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
    dedupStats,
    transportOriginCounts
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
    processType: 'daemon',
    pid: process.pid,
    port,
    projectPath,
    initialized: Boolean(initialized),
    sessions: sessionCount ?? 0,
    background,
    transport: 'streamable-http',
    error: initError?.message || null
  };
}

await refreshLiveToolRegistry(logger);

const arg1 = process.argv[2];
const arg2 = process.argv[3];

// Detect which arg is port (numeric 1-65535) and which is project path
const parsedArg1AsPort = Number(arg1);
const parsedArg2AsPort = Number(arg2);
const arg1IsPort = Number.isFinite(parsedArg1AsPort) && parsedArg1AsPort > 0 && parsedArg1AsPort < 65536;
const arg2IsPort = Number.isFinite(parsedArg2AsPort) && parsedArg2AsPort > 0 && parsedArg2AsPort < 65536;

let projectPath;
let portStr;

if (arg1IsPort && arg2IsPort) {
  // Both are ports - use defaults
  projectPath = process.cwd();
  portStr = String(arg2);
} else if (arg1IsPort) {
  // arg1 is port, arg2 is path or missing
  projectPath = arg2 || process.cwd();
  portStr = arg1;
} else if (arg2IsPort) {
  // arg1 is path, arg2 is port
  projectPath = arg1 || process.cwd();
  portStr = arg2;
} else {
  // Neither is port - arg1 is path or cwd
  projectPath = arg1 || process.cwd();
  portStr = '9999';
}

// Apply env var override if present
if (process.env.OMNYSYS_MCP_PORT) {
  portStr = process.env.OMNYSYS_MCP_PORT;
}

projectPath = path.resolve(projectPath);
let port = Number(portStr);

if (!Number.isFinite(port) || port < 0 || port >= 65536) {
  logger.warn(`Invalid port value: "${portStr}". Using default port 9999.`);
  port = 9999;
}

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

const executeLiveMcpToolCall = (request, sessionContext = {}) => executeMcpToolCall(request, {
  initError: () => initError,
  core,
  projectPath,
  getLiveToolHandler,
  refreshToolRegistry: refreshLiveToolRegistry,
  transportContext: sessionContext.transportContext || null
});

const buildSessionServer = (transportContext = null) => buildServerForSession({
  logger,
  getLiveToolDefinitions,
  executeMcpToolCall: executeLiveMcpToolCall,
  getRuntimeResourceSnapshot,
  transportContext
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
  getSessionManager,
  normalizeMcpRequestHeaders
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

  // CRITICAL: Add memory metrics to health check for leak detection
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

  // Memory leak detection: Use ABSOLUTE thresholds (MB), not percentages
  // OmnySystem legitimately uses 600-900MB after initialization
  // Percentages are misleading because V8 grows heap dynamically
  const MEMORY_WARNING_MB = 2000;   // 2GB - start monitoring
  const MEMORY_CRITICAL_MB = 3500;  // 3.5GB - immediate action needed

  const isMemoryWarning = heapUsedMB > MEMORY_WARNING_MB;
  const isMemoryCritical = heapUsedMB > MEMORY_CRITICAL_MB;

  // CRITICAL: Rate limit memory warnings to avoid log spam
  // Only log once per 5 minutes max
  const MEMORY_LOG_COOLDOWN_MS = 5 * 60 * 1000;
  const lastWarningAt = global._omnysysLastMemoryWarningAt || 0;
  const now = Date.now();

  if ((isMemoryWarning || isMemoryCritical) && (now - lastWarningAt > MEMORY_LOG_COOLDOWN_MS)) {
    const level = isMemoryCritical ? 'error' : 'warn';
    const message = isMemoryCritical
      ? `MEMORY CRITICAL: Heap at ${heapUsedMB}MB (threshold: ${MEMORY_CRITICAL_MB}MB). Possible leak. GC recommended.`
      : `MEMORY WARNING: Heap at ${heapUsedMB}MB (threshold: ${MEMORY_WARNING_MB}MB). Monitor for growth.`;

    logger[level](message);
    global._omnysysLastMemoryWarningAt = now;
  }

  // Calculate percentage for health status (still useful for trending)
  const heapUsagePercent = heapTotalMB > 0 ? Math.round((heapUsedMB / heapTotalMB) * 100) : 0;
  const isMemoryDegraded = isMemoryCritical;

  const healthSnapshot = buildHealthSnapshot({
    initialized: core.initialized,
    initError,
    projectPath,
    sessionCount: sessions.size,
    background
  });

  // Add memory info to response
  res.json({
    ...healthSnapshot,
    memory: {
      heapUsedMB,
      heapTotalMB,
      rssMB,
      heapUsagePercent,
      isDegraded: isMemoryDegraded
    },
    // Override status if memory is critically high
    status: isMemoryDegraded ? 'degraded' : healthSnapshot.status,
    ready: isMemoryDegraded ? false : healthSnapshot.ready
  });
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

// CRITICAL: Centralized Health API with memory diagnostics
app.get('/api/health', async (req, res) => {
  await handleHealthApiRequest(req, res, core);
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

// CRITICAL: Boot timeout diagnostic — must be set BEFORE core.initialize() starts
const BOOT_TIMEOUT_MS = 45000;
let bootComplete = false;
const bootTimer = setTimeout(() => {
  if (!bootComplete) {
    process.stderr.write(`[WORKER BOOT TIMEOUT] Initialization exceeded ${BOOT_TIMEOUT_MS}ms. Core initialized: ${core.initialized}\n`);
  }
}, BOOT_TIMEOUT_MS);
bootTimer.unref();

// CRITICAL: Handle IPC messages from proxy (cooldown warnings, etc.)
// This allows proxy-side warnings to appear in AI agent's _recentErrors
if (process.send) {
  process.on('message', (msg) => {
    if (msg?.type === 'cooldown-warning') {
      const cooldownMsg = `[PROXY COOLDOWN] ${msg.message || 'unknown'}`;
      logger.warn(cooldownMsg);
      // CRITICAL: Also push to global pending errors buffer so next tool call picks it up
      if (!global._omnysysPendingRuntimeErrors) global._omnysysPendingRuntimeErrors = [];
      global._omnysysPendingRuntimeErrors.push({
        type: 'cooldown-warning',
        message: cooldownMsg,
        file: msg.file || null,
        reason: msg.reason || null,
        timestamp: new Date().toISOString()
      });
      // Keep buffer capped
      if (global._omnysysPendingRuntimeErrors.length > 20) {
        global._omnysysPendingRuntimeErrors = global._omnysysPendingRuntimeErrors.slice(-20);
      }
    }
  });
}

// CRITICAL: Patch core.initialize to track boot completion and clear timer
const _origCoreInit = core.initialize.bind(core);
core.initialize = async function() {
  try {
    const result = await _origCoreInit();
    bootComplete = true;
    clearTimeout(bootTimer);
    return result;
  } catch (error) {
    bootComplete = false;
    clearTimeout(bootTimer);
    process.stderr.write(`[WORKER BOOT FAILED] core.initialize() threw: ${error.message}\n${error.stack || ''}\n`);
    throw error;
  }
};

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
