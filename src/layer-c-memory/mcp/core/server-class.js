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
  LLMSetupStep,
  LayerAAnalysisStep,
  OrchestratorInitStep,
  CacheInitStep,
  McpSetupStep,
  ReadyStep
} from './initialization/steps/index.js';

import path from 'path';
import { createLogger } from '../../../utils/logger.js';

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
export class OmnySysMCPServer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.OmnySysDataPath = path.join(projectPath, '.omnysysdata');
    this.OmnySysRoot = projectPath;

    // Components (initialized by steps)
    this.orchestrator = null;
    this.cache = null;
    this.server = null;

    // State
    this.initialized = false;
    this.startTime = Date.now();

    // Build initialization pipeline
    this.pipeline = new InitializationPipeline([
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
        logger.info('\n✅ Server initialized successfully\n');
      } else {
        logger.info(`\n❌ Initialization failed at: ${result.failedAt || result.haltedAt}`);
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
    logger.info('\n╔═══════════════════════════════════════════════════════════════╗');
    logger.info('║     OmnySys MCP Server v3.0.0                                 ║');
    logger.info('║     Fractal Architecture: A→B→C Pipeline                      ║');
    logger.info('╚═══════════════════════════════════════════════════════════════╝\n');
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

      if (this.orchestrator) {
        // Orchestrator cleanup if needed
        logger.info('  ✅ Orchestrator cleaned up');
      }

      if (this.cache) {
        // Cache cleanup if needed
        logger.info('  ✅ Cache cleaned up');
      }

      logger.info('\n👋 Server shutdown complete\n');
    } catch (error) {
      logger.info('Error during shutdown:', error.message);
    }
  }
}

export default OmnySysMCPServer;
