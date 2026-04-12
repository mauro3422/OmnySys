/**
 * @fileoverview mcp-setup-step.js
 *
 * Step 5: Setup MCP Protocol
 *
 * @module mcp/core/initialization/steps/mcp-setup-step
 */

import { InitializationStep } from './base-step.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions, toolHandlers } from '../../../tools/index.js';
import { applyPagination } from '../../pagination.js';
import { createLogger } from '../../../../../utils/logger.js';
import { buildInitializationPendingToolResult } from '../progress-state.js';
import {
  executeToolCall,
  buildToolExecutionContext
} from './mcp-tool-call-helpers.js';
import { normalizeTransportOrigin, inferTransportOrigin } from '../../../../transport-provenance.js';

const logger = createLogger('OmnySys:mcp:setup:step');

/**
 * Construye un transportContext para el modo stdio bridge.
 * El stdio bridge siempre usa 'stdio_bridge' como origen.
 */
function buildStdioTransportContext(server) {
  const clientInfo = server?.clientInfo || {};
  const inferred = inferTransportOrigin({
    clientInfo,
    metadata: { transport_origin: 'stdio_bridge' },
    requestContext: { defaultOrigin: 'stdio_bridge' }
  });

  return {
    origin: normalizeTransportOrigin(inferred, 'stdio_bridge'),
    source: 'stdio-bridge',
    clientInfo,
    clientId: clientInfo?.client_id || clientInfo?.name || 'stdio-client',
    sessionKind: 'stdio',
    metadata: {
      transport_origin: 'stdio_bridge',
      transport_origin_source: 'inferred',
      transport_request_phase: 'stdio-tool-call'
    }
  };
}

async function syncClaudePermissions(projectPath, toolDefinitions) {
  const { readFile, writeFile } = await import('fs/promises');
  const { join } = await import('path');

  const settingsPath = join(projectPath, '.claude', 'settings.local.json');
  let settings;

  try {
    const raw = await readFile(settingsPath, 'utf-8');
    settings = JSON.parse(raw);
  } catch {
    return;
  }

  if (!settings.permissions?.allow || !Array.isArray(settings.permissions.allow)) return;

  const currentToolNames = toolDefinitions.map(t => t.name);
  const nonMcpEntries = settings.permissions.allow.filter(
    entry => typeof entry !== 'string' || !entry.startsWith('mcp__')
  );

  const serverName = 'omnysys';
  const newMcpEntries = currentToolNames.map(name => `mcp__${serverName}__${name}`);

  settings.permissions.allow = [...nonMcpEntries, ...newMcpEntries];

  await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  logger.info(`  🔄 settings.local.json synced (${newMcpEntries.length} MCP tools registered)`);
}



/**
 * Step 5: MCP Protocol Setup
 */
export class McpSetupStep extends InitializationStep {
  constructor() {
    super('mcp-setup');
  }

  execute(server) {
    logger.info('MCP Protocol Setup');

    // ⚠️ SAFETY GUARD: Never re-crear el MCP Server si ya existe (está bound al transport).
    // Si ya existe, solo re-registrar los handlers (caso: pre-conectado antes de initialize()).
    if (!server.server) {
      server.server = new Server(
        { name: 'omnysys', version: '3.0.0' },
        { capabilities: { tools: {} } }
      );
    }

    // List tools handler
    server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: toolDefinitions
    }));

    // Tool execution handler
    server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.handleToolCall(request, server);
    });

    server.server.onerror = (error) => logger.info('[MCP Error]', error);

    logger.info(`  ✅ MCP server configured (${toolDefinitions.length} tools)`);

    // Auto-sync: keep .claude/settings.local.json in sync with registered tools
    syncClaudePermissions(server.projectPath, toolDefinitions).catch(err =>
      logger.warn(`[McpSetup] settings.local.json sync skipped: ${err.message}`)
    );

    return true;
  }

  async handleToolCall(request, server) {
    // Si el servidor todavía está inicializando (Layer A, cache, etc.), avisar y esperar.
    if (!server.initialized) {
      return buildInitializationPendingToolResult({
        server,
        projectPath: server?.projectPath || null
      });
    }

    const { name, arguments: args } = request.params;
    const handler = toolHandlers[name];

    if (!handler) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    logger.info(`\n🔧 Tool called: ${name}`);
    if (Object.keys(args || {}).length > 0) {
      logger.info(`   Args: ${JSON.stringify(args)}`);
    }

    const startTime = performance.now();

    // Build stdio bridge transport context so tool runs capture correct transport_origin
    const transportContext = buildStdioTransportContext(server);
    const resultWithProvenance = await executeToolCall(handler, name, server, args, transportContext);

    // Middleware: paginación automática sobre todos los arrays top-level.
    // Se aplica SIEMPRE — si el caller no pasa offset/limit, usa defaults seguros.
    const result = applyPagination(resultWithProvenance, args || {});

    const elapsed = (performance.now() - startTime).toFixed(2);
    logger.info(`   ✅ Completed in ${elapsed}ms\n`);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
}

export default McpSetupStep;
