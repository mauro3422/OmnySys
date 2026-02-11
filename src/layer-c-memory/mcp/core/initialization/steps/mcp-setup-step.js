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
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('STEP 5: MCP Protocol Setup');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    server.server = new Server(
      { name: 'omnysys', version: '3.0.0' },
      { capabilities: { tools: {} } }
    );

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

    const result = await handler(args, context);

    const elapsed = (performance.now() - startTime).toFixed(2);
    logger.info(`   ✅ Completed in ${elapsed}ms\n`);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
}

export default McpSetupStep;
