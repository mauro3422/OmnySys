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

    // Auto-sync: keep .claude/settings.local.json in sync with registered tools
    this.syncClaudePermissions(server.projectPath).catch(err =>
      logger.warn(`[McpSetup] settings.local.json sync skipped: ${err.message}`)
    );

    return true;
  }

  /**
   * Keeps .claude/settings.local.json in sync with currently registered MCP tools.
   * Removes stale mcp__omnysys__ entries and adds entries for all active tools.
   * Runs after every server start — safe to call multiple times (idempotent).
   */
  async syncClaudePermissions(projectPath) {
    const { readFile, writeFile } = await import('fs/promises');
    const { join } = await import('path');

    const settingsPath = join(projectPath, '.claude', 'settings.local.json');
    let settings;

    try {
      const raw = await readFile(settingsPath, 'utf-8');
      settings = JSON.parse(raw);
    } catch {
      // File doesn't exist or is malformed — skip silently
      return;
    }

    if (!settings.permissions?.allow || !Array.isArray(settings.permissions.allow)) return;

    // Current active tool names from registry (e.g. "mcp_omnysystem_query_graph")
    const currentToolNames = toolDefinitions.map(t => t.name);

    // Remove ALL existing mcp__ tool permission entries (any server name, any tool)
    const nonMcpEntries = settings.permissions.allow.filter(
      entry => typeof entry !== 'string' || !entry.startsWith('mcp__')
    );

    // Add refreshed entries for all currently registered tools
    // Format: mcp__[serverName]__[toolName] (Claude Code permission convention)
    const serverName = 'omnysys';
    const newMcpEntries = currentToolNames.map(name => `mcp__${serverName}__${name}`);

    settings.permissions.allow = [...nonMcpEntries, ...newMcpEntries];

    await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    logger.info(`  🔄 settings.local.json synced (${newMcpEntries.length} MCP tools registered)`);
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

    // Get recent errors/warnings AFTER the tool runs (not before)
    let recentErrors = { count: 0, warnings: 0, errors: 0, logs: [] };
    try {
      const { getRecentLogs, clearRecentLogs } = await import('#utils/logger.js');
      const logs = getRecentLogs();
      recentErrors = {
        count: logs.length,
        warnings: logs.filter(l => l.level === 'warn').length,
        errors: logs.filter(l => l.level === 'error').length,
        logs: logs.map(l => ({ level: l.level, message: l.message, time: new Date(l.time).toISOString() }))
      };
      clearRecentLogs();
    } catch (e) {
      // Ignore - logger may not have these functions yet
    }

    // Add recent errors to result if there are any (BEFORE pagination)
    const resultWithErrors = recentErrors.count > 0
      ? { _recentErrors: recentErrors, ...rawResult }
      : rawResult;

    // Middleware: paginación automática sobre todos los arrays top-level.
    // Se aplica SIEMPRE — si el caller no pasa offset/limit, usa defaults seguros.
    const result = applyPagination(resultWithErrors, args || {});

    const elapsed = (performance.now() - startTime).toFixed(2);
    logger.info(`   ✅ Completed in ${elapsed}ms\n`);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
}

export default McpSetupStep;