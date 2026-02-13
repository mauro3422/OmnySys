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
import { getErrorGuardian } from '../../../core/error-guardian.js';
import { HotReloadManager } from './hot-reload-manager.js';

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
    this.pipeline = new InitializationPipeline([
      new InstanceDetectionStep(),
      new LLMSetupStep(),
      new LayerAAnalysisStep(),
      new OrchestratorInitStep(),
      new CacheInitStep(),
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
    await this.initialize();

    if (!this.server) {
      throw new Error('MCP server not initialized');
    }

    // Connect to stdio for MCP protocol communication
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('🔌 MCP Server connected via stdio\n');
  }

  /**
   * Shutdown the server gracefully
   */
  async shutdown() {
    logger.info('\n🛑 Shutting down server...');

    try {
      if (this.server) {
        await this.server.close();
        logger.info('  ✅ MCP server closed');
      }

      if (this._healthBeacon) {
        await new Promise(resolve => this._healthBeacon.close(resolve));
        logger.info('  ✅ Health beacon closed');
      }

      if (this._watchdogInterval) {
        clearInterval(this._watchdogInterval);
        this._watchdogInterval = null;
        logger.info('  ✅ Watchdog stopped');
      }

      if (this.orchestrator) {
        await this.orchestrator.stop();
        logger.info('  ✅ Orchestrator stopped');
      }

      if (this.cache) {
        // Cache cleanup if needed
        logger.info('  ✅ Cache cleaned up');
      }

      if (this.hotReloadManager) {
        this.hotReloadManager.stop();
        logger.info('  ✅ Hot-reload stopped');
      }

      const mode = this.isPrimary ? 'PRIMARY' : 'LIGHT';
      logger.info(`\n👋 Server shutdown complete (was ${mode})\n`);
    } catch (error) {
      logger.info('Error during shutdown:', error.message);
    }
  }
}

export default OmnySysMCPServer;
