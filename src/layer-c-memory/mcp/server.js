/**
 * CogniSystem MCP Server
 * 
 * Implementación del protocolo MCP usando @modelcontextprotocol/sdk
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { Orchestrator } from '../../core/orchestrator.js';
import { UnifiedCacheManager } from '../../core/unified-cache-manager.js';
import { toolDefinitions, toolHandlers } from './tools/index.js';
import { startLLM } from './llm-starter.js';
import { getProjectMetadata } from '../../layer-a-static/storage/query-service.js';

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class CogniSystemMCPServer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.omnySystemRoot = path.resolve(__dirname, '../../..');
    this.orchestrator = null;
    this.cache = null;
    this.server = null;
    this.transport = null;
  }

  async initialize() {
    console.error('\n🚀 CogniSystem MCP Server - Initializing...');
    console.error(`📂 Project: ${this.projectPath}`);

    // Count files
    const fileCount = await this.countProjectFiles();
    console.error(`📊 Found ${fileCount} JS/TS files`);

    // Start LLM
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 1: AI Server Setup');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await startLLM(this.omnySystemRoot);

    // Init Orchestrator
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 2: Initialize Orchestrator');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.orchestrator = new Orchestrator(this.projectPath, {
      enableFileWatcher: true,
      enableWebSocket: false,
      autoStartLLM: false
    });
    await this.orchestrator.initialize();

    // Init Cache
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 3: Initialize Cache');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.cache = new UnifiedCacheManager(this.projectPath);
    await this.cache.initialize();

    // Check analysis
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 4: Check Analysis Status');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await this.checkAnalysisStatus();

    // Setup MCP
    this.setupMCP();

    console.error('\n✅ MCP Server initialized and ready\n');
  }

  async countProjectFiles() {
    try {
      const { scanProject } = await import('../../layer-a-static/scanner.js');
      const files = await scanProject(this.projectPath);
      return files.length;
    } catch {
      return 0;
    }
  }

  async checkAnalysisStatus() {
    try {
      const indexPath = path.join(this.projectPath, '.OmnySystemData', 'index.json');
      await fs.access(indexPath);
      const metadata = await getProjectMetadata(this.projectPath);
      console.error(`✅ Found existing analysis: ${metadata?.metadata?.totalFiles || 0} files`);
    } catch {
      console.error('⚠️  No analysis found, starting background indexing...');
      this.orchestrator.startBackgroundIndexing();
    }
  }

  setupMCP() {
    this.server = new Server(
      { name: 'cognisystem', version: '3.0.0' },
      { capabilities: { tools: {} } }
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: toolDefinitions
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const handler = toolHandlers[name];

      if (!handler) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      const context = {
        orchestrator: this.orchestrator,
        cache: this.cache,
        projectPath: this.projectPath
      };

      const result = await handler(args, context);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    });

    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  async run() {
    await this.initialize();
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    console.error('💡 MCP Server running via stdio\n');
  }

  async shutdown() {
    console.error('\n👋 Shutting down MCP server...');
    await this.orchestrator?.stop();
    await this.transport?.close();
    console.error('✅ MCP server stopped');
  }
}
