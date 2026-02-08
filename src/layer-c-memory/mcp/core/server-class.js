/**
 * @fileoverview server-class.js
 * 
 * Clase principal OmnySysMCPServer.
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

import { Orchestrator } from '#core/orchestrator.js';
import { UnifiedCacheManager } from '#core/unified-cache-manager.js';
import { toolDefinitions, toolHandlers } from '../tools/index.js';

import path from 'path';
import fs from 'fs/promises';

/**
 * OmnySys MCP Server - Entry Point Único
 * 
 * Flujo de inicialización:
 * 1. AI Server Setup (LLM)
 * 2. Layer A - Static Analysis (bloqueante si no existe)
 * 3. Initialize Orchestrator (con datos de Layer A)
 * 4. Initialize Cache
 * 5. Setup MCP Protocol
 */
export class OmnySysMCPServer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.OmnySysDataPath = path.join(projectPath, '.omnysysdata');
    this.omnysysPath = path.join(projectPath, 'omnysysdata'); // Compatibilidad legacy
    this.OmnySysRoot = projectPath; // Usar projectPath directamente en lugar de calcular desde __dirname
    
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
    console.error('║     OmnySys MCP Server v3.0.0                             ║');
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
    console.error('  ✅ Orchestrator ready\n');
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
      await import('#layer-a/query/index.js');

    this.metadata = await getProjectMetadata(this.projectPath);
    this.cache.set('metadata', this.metadata);
    console.error('  ✅ Metadata cached');

    const connections = await getAllConnections(this.projectPath);
    this.cache.set('connections', connections);
    console.error(`  ✅ Connections cached (${connections.total} total)`);

    const assessment = await getRiskAssessment(this.projectPath);
    this.cache.set('assessment', assessment);
    const totalIssues = assessment.report?.summary
      ? (assessment.report.summary.criticalCount || 0) +
        (assessment.report.summary.highCount || 0) +
        (assessment.report.summary.mediumCount || 0) +
        (assessment.report.summary.lowCount || 0)
      : 0;
    console.error(`  ✅ Risk assessment cached (${totalIssues} issues)`);

    const cacheTime = (performance.now() - startCache).toFixed(2);
    console.error(`\n  Cache load time: ${cacheTime}ms`);
    console.error(`  Cache memory: ${this.cache.getRamStats().memoryUsage}\n`);
  }

  _step5_MCP() {
    this.server = new Server(
      { name: 'omnysys', version: '3.0.0' },
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

      // Log tool usage
      console.error(`\n🔧 Tool called: ${name}`);
      if (Object.keys(args || {}).length > 0) {
        console.error(`   Args: ${JSON.stringify(args)}`);
      }
      const startTime = performance.now();

      const context = {
        orchestrator: this.orchestrator,
        cache: this.cache,
        projectPath: this.projectPath,
        server: this
      };

      const result = await handler(args, context);

      const elapsed = (performance.now() - startTime).toFixed(2);
      console.error(`   ✅ Completed in ${elapsed}ms\n`);

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
    
    // Generar lista de tools dinámicamente desde el registro
    const totalTools = toolDefinitions.length;
    console.error(`\n🔧 Available tools (${totalTools} total):`);
    
    // Categorizar tools
    const coreTools = toolDefinitions.filter(t => 
      ['get_impact_map', 'analyze_change', 'explain_connection', 'get_risk_assessment', 'search_files', 'get_server_status'].includes(t.name)
    );
    const omniscienceTools = toolDefinitions.filter(t => 
      ['get_call_graph', 'analyze_signature_change', 'explain_value_flow'].includes(t.name)
    );
    const atomicTools = toolDefinitions.filter(t => 
      ['get_function_details', 'get_molecule_summary', 'get_atomic_functions', 'restart_server'].includes(t.name)
    );
    const otherTools = toolDefinitions.filter(t => 
      ![...coreTools, ...omniscienceTools, ...atomicTools].includes(t)
    );
    
    // Imprimir por categoría
    if (coreTools.length > 0) {
      console.error('  Core Tools:');
      coreTools.forEach(tool => {
        const params = Object.keys(tool.inputSchema?.properties || {}).join(', ');
        console.error(`   • ${tool.name}(${params})`);
      });
    }
    
    if (omniscienceTools.length > 0) {
      console.error('  🧠 Omniscience Tools:');
      omniscienceTools.forEach(tool => {
        const params = Object.keys(tool.inputSchema?.properties || {}).join(', ');
        console.error(`   • ${tool.name}(${params})`);
      });
    }
    
    if (atomicTools.length > 0) {
      console.error('  🧬 Atomic Tools:');
      atomicTools.forEach(tool => {
        const params = Object.keys(tool.inputSchema?.properties || {}).join(', ');
        console.error(`   • ${tool.name}(${params})`);
      });
    }
    
    if (otherTools.length > 0) {
      console.error('  Other Tools:');
      otherTools.forEach(tool => {
        const params = Object.keys(tool.inputSchema?.properties || {}).join(', ');
        console.error(`   • ${tool.name}(${params})`);
      });
    }
    
    console.error('\n📡 Claude can now use these tools!');
    console.error('💡 If a file is not analyzed, it will be auto-queued as CRITICAL\n');

    // Emitir evento de ready
    this.orchestrator.emit('mcp:ready');
  }

  // ==========================================
  // Public Methods
  // ==========================================

  async run() {
    // ==========================================
    // MCP Handshake debe ser INMEDIATO
    // ==========================================
    
    // 1. Setup MCP server mínimo PRIMERO
    this._step5_MCP();
    
    // 2. Conectar transporte inmediatamente (handshake ocurre aquí)
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    console.error('💡 MCP Server connected via stdio\n');
    
    // 3. Inicialización pesada en BACKGROUND (después del handshake)
    this._initializeInBackground().catch(error => {
      console.error('❌ Background initialization failed:', error);
    });
  }

  /**
   * Inicialización pesada en background
   * Corre DESPUÉS del handshake MCP
   */
  async _initializeInBackground() {
    try {
      console.error('\n╔═══════════════════════════════════════════════════════════════╗');
      console.error('║     OmnySys MCP Server v3.0.0                             ║');
      console.error('║     Entry Point Único - IA-Native Architecture                ║');
      console.error('╚═══════════════════════════════════════════════════════════════╝\n');
      console.error(`📂 Project: ${this.projectPath}\n`);
      console.error('⚡ Starting background initialization...\n');

      // STEP 1: AI Server Setup (LLM)
      await this._step1_LLMSetup();

      // STEP 2: Layer A Analysis
      await this._step2_LayerAAnalysis();

      // STEP 3: Orchestrator
      await this._step3_Orchestrator();

      // STEP 4: Cache
      await this._step4_Cache();

      // STEP 5: Ready
      await this._step6_Ready();

      this.initialized = true;
      console.error('\n✅ Background initialization complete!\n');
      
      // Emitir evento
      this.orchestrator?.emit('mcp:initialized');
      
    } catch (error) {
      console.error('\n❌ Background initialization failed:');
      console.error(error.message);
      console.error(error.stack);
    }
  }

  async shutdown() {
    console.error('\n👋 Shutting down MCP server...');
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    try {
      await this.orchestrator?.stop();
    } catch (error) {
      console.error('❌ Error stopping orchestrator:', error.message);
    }
    
    try {
      await this.transport?.close();
    } catch (error) {
      console.error('❌ Error closing transport:', error.message);
    }
    
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
      cache: this.cache?.getStats(),
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
