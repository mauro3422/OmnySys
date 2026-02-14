/**
 * @fileoverview orchestrator-init-step.js
 *
 * Step 4: Initialize Orchestrator (AFTER LLM)
 * 
 * Must run AFTER LLMSetupStep so LLM is starting in background.
 * Inits FileWatcher, Workers, connects to shared cache and LLM.
 *
 * @module mcp/core/initialization/steps/orchestrator-init-step
 */

import { InitializationStep } from './base-step.js';
import { Orchestrator } from '#core/orchestrator.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:orchestrator:init:step');



/**
 * Step 4: Orchestrator Initialization
 * Uses shared cache from server, connects to LLM when ready.
 */
export class OrchestratorInitStep extends InitializationStep {
  constructor() {
    super('orchestrator-init');
  }

  shouldExecute(server) {
    // LIGHT mode skips Orchestrator — PRIMARY handles it
    return server.isPrimary !== false;
  }

  async execute(server) {
    logger.info('Initialize Orchestrator');

    // Pass the server's cache to the orchestrator to avoid duplication
    server.orchestrator = new Orchestrator(server.projectPath, {
      enableFileWatcher: true,
      enableWebSocket: false,
      autoStartLLM: false, // LLM is started after orchestrator (on-demand)
      cache: server.cache  // Share cache with server to avoid duplication
    });

    await server.orchestrator.initialize();
    logger.info('  ✅ Orchestrator ready');
    logger.info('     Shared cache: Enabled');
    logger.info('     FileWatcher: Active');
    logger.info('     Workers: Ready');

    return true;
  }

  async rollback(server, error) {
    if (server.orchestrator) {
      await server.orchestrator.stop();
      server.orchestrator = null;
      logger.info('  ✅ Orchestrator stopped');
    }
  }
}

export default OrchestratorInitStep;
