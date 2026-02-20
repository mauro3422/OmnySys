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

const logger = createLogger('OmnySys:mcp:setup:step');



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
    return true;
  }

  async handleToolCall(request, server) {
    // Si el servidor todavía está inicializando (Layer A, cache, etc.), avisar y esperar.
    if (!server.initialized) {
      return {
        content: [{ type: 'text', text: '⏳ OmnySys se está inicializando (análisis estático en progreso). Reintentá en unos segundos.' }]
      };
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

    const context = {
      orchestrator: server.orchestrator,
      cache: server.cache,
      projectPath: server.projectPath,
      server
    };

    const rawResult = await handler(args, context);

    // Middleware: paginación automática sobre todos los arrays top-level.
    // Se aplica SIEMPRE — si el caller no pasa offset/limit, usa defaults seguros.
    const result = applyPagination(rawResult, args || {});

    const elapsed = (performance.now() - startTime).toFixed(2);
    logger.info(`   ✅ Completed in ${elapsed}ms\n`);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
}

export default McpSetupStep;
