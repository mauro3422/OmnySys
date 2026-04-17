/**
 * @fileoverview server-class.js
 *
 * Main OmnySys MCP server entry point.
 */

import path from 'path';
import { EventEmitter } from 'events';

import { createLogger } from '../../../utils/logger.js';
import { getErrorGuardian } from '../../../core/error-guardian/index.js';
import { performServerShutdown } from './shutdown.js';
import {
  initializeHotReload,
  initializeRuntimeRestartState,
} from './server-class-helpers.js';
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

const logger = createLogger('OmnySys:server:class');

export class OmnySysMCPServer extends EventEmitter {
  constructor(projectPath) {
    super();
    this.projectPath = projectPath;
    this.OmnySysDataPath = path.join(projectPath, '.omnysysdata');
    this.OmnySysRoot = projectPath;

    this.errorGuardian = getErrorGuardian(projectPath);
    this.orchestrator = null;
    this.cache = null;
    this.server = null;
    this.sharedState = {};

    initializeRuntimeRestartState(this);

    // Live Insight Registry for Zero-Latency querying
    this.liveInsights = null;
    this.insightsDirty = true;
    this._backgroundInsightTask = null;
    this._insightRefreshCooldownMs = 10000; // 10s cooldown after changes


    this.initialized = false;
    this.startTime = Date.now();

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

  async initialize() {
    this.printBanner();

    try {
      const result = await this.pipeline.execute(this);

      if (result.success) {
        this.initialized = true;
        logger.info('\n' + '='.repeat(60));
        logger.info('✅ INITIALIZATION COMPLETE');
        logger.info('='.repeat(60) + '\n');
        const hotReloadEnabled = process.env.OMNYSYS_HOT_RELOAD !== 'false';
        const result = initializeHotReload(this, logger, hotReloadEnabled);
        if (!result.enabled || !this.hotReloadManager) {
          logger.info('   Continuing without hot-reload...\n');
        } else {
          try {
            await this.hotReloadManager.start();
            logger.info('🔥 Hot-reload enabled - System can self-improve');
            logger.info(`   Runtime restart mode: ${this.runtimeRestartMode}`);
            logger.info('   Watching for code changes in src/\n');
          } catch (error) {
            logger.warn(`⚠️  Hot-reload disabled after startup failure: ${error.message}`);
            logger.debug?.(error.stack || '');
            this.hotReloadManager = null;
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

  async run() {
    const mcpSetup = new McpSetupStep();
    mcpSetup.execute(this);

    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('🔌 MCP Server pre-connected (initializing in background...)\n');

    await this.initialize();
    logger.info('✅ MCP Server ready and operational\n');
  }

  async shutdown() {
    await performServerShutdown(this);
  }
}

export default OmnySysMCPServer;
