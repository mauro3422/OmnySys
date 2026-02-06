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
    this.OmnySysRoot = path.resolve(__dirname, '../../..');
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
    await startLLM(this.OmnySysRoot);

    // Check/Run Analysis FIRST (before Orchestrator and Cache)
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 2: Layer A - Static Analysis');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await this.checkAndRunAnalysis();

    // Init Orchestrator (now with analysis data available)
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 3: Initialize Orchestrator');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.orchestrator = new Orchestrator(this.projectPath, {
      enableFileWatcher: true,
      enableWebSocket: false,
      autoStartLLM: false
    });
    await this.orchestrator.initialize();

    // Init Cache (now loads from Layer A automatically)
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 4: Initialize Cache');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.cache = new UnifiedCacheManager(this.projectPath);
    await this.cache.initialize();

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

  async checkAndRunAnalysis() {
    try {
      const indexPath = path.join(this.projectPath, '.OmnySysData', 'index.json');
      await fs.access(indexPath);
      const metadata = await getProjectMetadata(this.projectPath);
      const fileCount = metadata?.metadata?.totalFiles || 0;
      
      console.error(`✅ Found existing analysis: ${fileCount} files`);
      
      // Validar si el análisis base de Layer A está completo
      // El análisis se considera válido si:
      // 1. Hay archivos en el índice (fileIndex)
      // 2. Layer A completó exitosamente (enhanced: true)
      // NOTA: El LLM enrichment puede estar pendiente y se procesará en background
      const hasValidBaseAnalysis = fileCount > 0 && 
        (metadata?.fileIndex || metadata?.files) && 
        metadata?.metadata?.enhanced === true;
      
      if (!hasValidBaseAnalysis) {
        console.error('   🚨 Analysis incomplete, running Layer A...');
        console.error('   ⏳ This may take 30-60 seconds...\n');
        
        // Ejecutar Layer A completo (BLOQUEANTE) - esto es necesario para tener metadatos
        await this.runFullIndexing();
        
        console.error('\n✅ Layer A completed');
        console.error('   🤖 LLM enrichment will continue in background');
      } else {
        console.error('   ✅ Layer A analysis valid');
        
        // Verificar si hay archivos pendientes de LLM
        const pendingLLM = await this._countPendingLLMAnalysis();
        if (pendingLLM > 0) {
          console.error(`   ⏳ ${pendingLLM} files pending LLM enrichment (background)`);
        } else {
          console.error('   ✅ All files processed');
        }
      }
    } catch {
      console.error('⚠️  No analysis found, running Layer A...');
      console.error('   ⏳ This may take 30-60 seconds...\n');
      
      // Ejecutar Layer A completo (BLOQUEANTE)
      await this.runFullIndexing();
      
      console.error('\n✅ Layer A completed');
      console.error('   🤖 LLM enrichment will continue in background');
    }
  }

  /**
   * Cuenta archivos pendientes de análisis LLM
   */
  async _countPendingLLMAnalysis() {
    try {
      const { getFileAnalysis } = await import('../../layer-a-static/storage/query-service.js');
      const metadata = await getProjectMetadata(this.projectPath);
      
      let pendingCount = 0;
      const fileEntries = metadata?.fileIndex || metadata?.files || {};
      
      for (const filePath of Object.keys(fileEntries)) {
        const analysis = await getFileAnalysis(this.projectPath, filePath);
        // Un archivo necesita LLM si:
        // 1. No tiene llmInsights Y
        // 2. Tiene características que sugieren que necesita LLM (orphan, shared state, etc.)
        if (!analysis?.llmInsights) {
          const needsLLM = analysis?.semanticAnalysis?.sharedState?.writes?.length > 0 ||
                          analysis?.semanticAnalysis?.eventPatterns?.eventListeners?.length > 0 ||
                          (analysis?.exports?.length > 0 && analysis?.dependents?.length === 0);
          
          if (needsLLM) pendingCount++;
        }
      }
      
      return pendingCount;
    } catch {
      return 0;
    }
  }
  
  async runFullIndexing() {
    const { indexProject } = await import('../../layer-a-static/indexer.js');
    
    console.error('   🚀 Starting Layer A: Static Analysis...');
    console.error('   ⏳ This may take 30-60 seconds...');
    
    try {
      const result = await indexProject(this.projectPath, {
        verbose: true,
        skipLLM: false,  // Permitir IA si detecta casos complejos
        outputPath: 'system-map.json'
      });
      
      console.error(`\n   📊 Layer A: ${Object.keys(result.files || {}).length} files analyzed`);
      
      // Verificar si IA se activó
      const hasLLM = Object.values(result.files || {}).some(
        f => f.aiEnhancement || f.llmInsights
      );
      
      if (hasLLM) {
        console.error('   🤖 Layer B: IA enrichment applied');
      } else {
        console.error('   ℹ️  Layer B: Static analysis sufficient (no IA needed)');
      }
      
      return result;
    } catch (error) {
      console.error('   ❌ Indexing failed:', error.message);
      throw error;
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
