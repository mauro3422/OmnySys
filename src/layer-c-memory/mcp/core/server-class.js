/**
 * @fileoverview server-class.js
 * 
 * Clase principal CogniSystemMCPServer.
 * Consolidación del flujo correcto con:
 * - Layer A primero (análisis estático)
 * - Luego detección de arquetipos
 * - Luego prompting engine (LLM selectivo)
 * 
 * @module mcp/core/server-class
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { Orchestrator } from '../../../core/orchestrator.js';
import { UnifiedCacheManager } from '../../../core/unified-cache-manager.js';
import { toolDefinitions, toolHandlers } from '../tools/index.js';

import path from 'path';
import fs from 'fs/promises';

/**
 * CogniSystem MCP Server - Entry Point Único
 * 
 * Flujo de inicialización:
 * 1. AI Server Setup (LLM)
 * 2. Layer A - Static Analysis (bloqueante si no existe)
 * 3. Initialize Orchestrator (con datos de Layer A)
 * 4. Initialize Cache
 * 5. Setup MCP Protocol
 */
export class CogniSystemMCPServer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.OmnySysDataPath = path.join(projectPath, '.OmnySysData');
    this.omnysysPath = path.join(projectPath, 'omnysysdata'); // Compatibilidad legacy
    this.OmnySysRoot = path.resolve(new URL(import.meta.url).pathname, '../../../..');
    
    // Components
    this.orchestrator = null;
    this.cache = null;
    this.server = null;
    this.transport = null;
    
    // State
    this.initialized = false;
    this.startTime = Date.now();
    this.statsInterval = null;
    this.metadata = null;
  }

  /**
   * Inicializa el servidor completo siguiendo el flujo correcto:
   * LLM → Layer A → Orchestrator → Cache → MCP
   */
  async initialize() {
    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║     CogniSystem MCP Server v3.0.0                             ║');
    console.error('║     Entry Point Único - IA-Native Architecture                ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');
    console.error(`📂 Project: ${this.projectPath}\n`);

    try {
      // ==========================================
      // STEP 1: AI Server Setup
      // ==========================================
      await this._step1_LLMSetup();

      // ==========================================
      // STEP 2: Layer A - Static Analysis
      // ==========================================
      await this._step2_LayerAAnalysis();

      // ==========================================
      // STEP 3: Initialize Orchestrator
      // ==========================================
      await this._step3_Orchestrator();

      // ==========================================
      // STEP 4: Initialize Cache
      // ==========================================
      await this._step4_Cache();

      // ==========================================
      // STEP 5: Setup MCP
      // ==========================================
      this._step5_MCP();

      // ==========================================
      // STEP 6: Server Ready
      // ==========================================
      await this._step6_Ready();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('\n❌ Initialization failed:');
      console.error(error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  // ==========================================
  // Initialization Steps
  // ==========================================

  async _step1_LLMSetup() {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 1: AI Server Setup');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const { startLLM } = await import('./llm-starter.js');
    await startLLM(this.OmnySysRoot);
  }

  async _step2_LayerAAnalysis() {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 2: Layer A - Static Analysis');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const { checkAndRunAnalysis } = await import('./analysis-checker.js');
    await checkAndRunAnalysis(this.projectPath);
  }

  async _step3_Orchestrator() {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 3: Initialize Orchestrator');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    this.orchestrator = new Orchestrator(this.projectPath, {
      enableFileWatcher: true,
      enableWebSocket: false,
      autoStartLLM: false // Ya iniciamos nosotros
    });
    
    await this.orchestrator.initialize();
    console.error('  ✓ Orchestrator ready\n');
  }

  async _step4_Cache() {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 4: Initialize Cache');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const startCache = performance.now();

    this.cache = new UnifiedCacheManager(this.projectPath, {
      enableChangeDetection: true,
      cascadeInvalidation: true
    });
    await this.cache.initialize();

    // Cargar metadatos y datos críticos
    const { getProjectMetadata, getAllConnections, getRiskAssessment } = 
      await import('../../../layer-a-static/storage/query-service.js');

    this.metadata = await getProjectMetadata(this.projectPath);
    this.cache.ramCacheSet('metadata', this.metadata);
    console.error('  ✓ Metadata cached');

    const connections = await getAllConnections(this.projectPath);
    this.cache.ramCacheSet('connections', connections);
    console.error('  ✓ Connections cached');

    const assessment = await getRiskAssessment(this.projectPath);
    this.cache.ramCacheSet('assessment', assessment);
    console.error('  ✓ Risk assessment cached');

    const cacheTime = (performance.now() - startCache).toFixed(2);
    console.error(`\n  Cache load time: ${cacheTime}ms`);
    console.error(`  Cache memory: ${this.cache.getCacheStats().memoryUsage}\n`);
  }

  _step5_MCP() {
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

  async _step6_Ready() {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('✅ MCP Server Ready!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('\n🔧 Available tools:');
    console.error('   • get_impact_map(filePath)');
    console.error('   • analyze_change(filePath, symbolName)');
    console.error('   • explain_connection(fileA, fileB)');
    console.error('   • get_risk_assessment(minSeverity)');
    console.error('   • search_files(pattern)');
    console.error('   • get_server_status()');
    console.error('\n📡 Claude can now use these tools!');
    console.error('💡 If a file is not analyzed, it will be auto-queued as CRITICAL\n');

    // Emitir evento de ready
    this.orchestrator.emit('mcp:ready');
  }

  // ==========================================
  // Public Methods
  // ==========================================

  async run() {
    await this.initialize();
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    console.error('💡 MCP Server running via stdio\n');
  }

  async shutdown() {
    console.error('\n👋 Shutting down MCP server...');
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    await this.orchestrator?.stop();
    await this.transport?.close();
    console.error('✅ MCP server stopped');
  }

  /**
   * Obtiene estadísticas del servidor
   */
  getStats() {
    return {
      project: this.projectPath,
      initialized: this.initialized,
      orchestrator: this.orchestrator?.getStatus(),
      metadata: {
        totalFiles: this.metadata?.metadata?.totalFiles || 0,
        totalFunctions: this.metadata?.metadata?.totalFunctions || 0
      },
      cache: this.cache?.getCacheStats(),
      uptime: process.uptime()
    };
  }

  /**
   * Inicia intervalo de stats (cada 30 segundos)
   */
  startStatsInterval(callback, intervalMs = 30000) {
    this.statsInterval = setInterval(() => {
      const stats = this.getStats();
      if (callback) callback(stats);
    }, intervalMs);
  }
}
