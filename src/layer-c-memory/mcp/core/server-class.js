/**
 * @fileoverview server-class.js
 * 
 * Clase principal OmnySysMCPServer.
 * Consolidación del flujo correcto con:
 * - Layer A primero (análisis estático)
 * - Luego detección de arquetipos
 * - Luego prompting engine (LLM selectivo)
 *
 * ARCHITECTURE: Layer C (MCP Server) - Entry Point for AI Tools
 * Orchestrates the complete A→B→C flow and exposes tools to AI agents
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Adding New Initialization Steps or MCP Tools
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To add a new system component (e.g., WebSocket server,
 * external API integration, additional cache layer):
 *
 * 1️⃣  CREATE STEP in: src/layer-c-memory/mcp/core/initialization/steps/
 *     Extend InitializationStep base class
 *
 * 2️⃣  ADD TO PIPELINE in constructor below
 *
 * ⚠️  IMPORTANT: Steps are sequential dependencies
 *     Step N can use resources initialized in Steps 1..N-1
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @module mcp/core/server-class
 * @phase 5 (MCP Server Layer C)
 * @dependencies Orchestrator, UnifiedCacheManager, toolDefinitions
 */

import { InitializationPipeline } from './initialization/pipeline.js';
import {
  InstanceDetectionStep,
  LLMSetupStep,
  LayerAAnalysisStep,
  OrchestratorInitStep,
  CacheInitStep,
  McpSetupStep,
  ReadyStep
} from './initialization/steps/index.js';
import { getErrorGuardian } from '../../../core/error-guardian/index.js';
import { HotReloadManager } from './hot-reload-manager/index.js';
import { performServerShutdown } from './server-shutdown.js';

import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { EventEmitter } from 'events';

const logger = createLogger('OmnySys:server:class');



/**
 * OmnySys MCP Server - Entry Point Único
 * 
 * Flujo de inicialización:
 * 1. AI Server Setup (LLM)
 * 2. Layer A - Static Analysis (bloqueante si no existe)
 * 3. Initialize Orchestrator (con datos de Layer A)
 * 4. Initialize Cache
 * 5. Setup MCP Protocol
 * 6. Server Ready
 */
export class OmnySysMCPServer extends EventEmitter {
  constructor(projectPath) {
    super();
    this.projectPath = projectPath;
    this.OmnySysDataPath = path.join(projectPath, '.omnysysdata');
    this.OmnySysRoot = projectPath;

    // 🛡️ Error Guardian - Protección recursiva desde el inicio
    this.errorGuardian = getErrorGuardian(projectPath);

    // Components (initialized by steps)
    this.orchestrator = null;
    this.cache = null;
    this.server = null;

    // 🔥 Hot-reload manager (self-improvement capability)
    this.hotReloadManager = null;

    // State
    this.initialized = false;
    this.startTime = Date.now();

    // Build initialization pipeline
    // InstanceDetectionStep MUST be first - it sets server.isPrimary
    // which controls whether heavy steps (LLM, LayerA, Orchestrator) execute
    // 
    // CORRECT ORDER:
    // 1. InstanceDetectionStep - Detect if another instance is running
    // 2. LayerAAnalysisStep    - Static analysis FIRST (creates .omnysysdata/)
    // 3. CacheInitStep         - Load data into cache
    // 4. LLMSetupStep          - Start LLM in background (non-blocking)
    // 5. OrchestratorInitStep  - Orchestrator (will connect to LLM when ready)
    // 6. McpSetupStep          - Setup MCP protocol
    // 7. ReadyStep             - Server ready
    this.pipeline = new InitializationPipeline([
      new InstanceDetectionStep(),
      new LayerAAnalysisStep(),
      new CacheInitStep(),
      new LLMSetupStep(),
      new OrchestratorInitStep(),
      new McpSetupStep(),
      new ReadyStep()
    ]);
  }

  /**
   * Initialize the server
   */
  async initialize() {
    this.printBanner();

    try {
      const result = await this.pipeline.execute(this);

      if (result.success) {
        this.initialized = true;
        logger.info('\n' + '='.repeat(60));
        logger.info('✅ INITIALIZATION COMPLETE');
        logger.info('='.repeat(60) + '\n');

        // 🔥 Iniciar hot-reload (activado por defecto, desactivar con OMNYSYS_HOT_RELOAD=false)
        const hotReloadEnabled = process.env.OMNYSYS_HOT_RELOAD !== 'false';
        if (hotReloadEnabled) {
          try {
            this.hotReloadManager = new HotReloadManager(this);
            await this.hotReloadManager.start();
            logger.info('🔥 Hot-reload enabled - System can self-improve');
            logger.info('   Watching for code changes in src/\n');
          } catch (error) {
            logger.warn('⚠️  Hot-reload failed to start:', error.message);
            logger.info('   Continuing without hot-reload...\n');
          }
        }
      } else {
        logger.error(`\n❌ Initialization failed at: ${result.failedAt || result.haltedAt}`);
        if (result.error) {
          logger.info('Error:', result.error.message);
        }
        process.exit(1);
      }

    } catch (error) {
      logger.info('\n❌ Fatal error during initialization:', error.message);
      logger.info(error.stack);
      process.exit(1);
    }
  }

  printBanner() {
    logger.info('\n' + '='.repeat(60));
    logger.info('  OmnySys MCP Server v3.0.0');
    logger.info('  Starting initialization...');
    logger.info('='.repeat(60));
    logger.info(`📂 Project: ${this.projectPath}\n`);
  }

  /**
   * Run the MCP server
   * Initializes and connects to stdio for MCP communication
   */
  async run() {
    // Conectar el transport ANTES de la inicialización pesada (Layer A, cache, etc.)
    // para que Claude Code reciba la respuesta al handshake `initialize` de inmediato
    // y no corte la conexión por timeout mientras Layer A analiza el proyecto.
    const mcpSetup = new McpSetupStep();
    mcpSetup.execute(this); // crea this.server + registra handlers

    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('🔌 MCP Server pre-conectado (inicializando en background...)\n');

    // Ahora correr la inicialización completa. El transport ya está activo,
    // así que Claude Code puede enviar/recibir mensajes durante este tiempo.
    // McpSetupStep detectará server.server existente y saltará re-creación.
    await this.initialize();

    logger.info('✅ MCP Server listo y operacional\n');
  }

  /**
   * Shutdown the server gracefully
   */
  async shutdown() {
    await performServerShutdown(this);
  }
}

export default OmnySysMCPServer;
