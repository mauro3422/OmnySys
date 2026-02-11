/**
 * @fileoverview orchestrator-init-step.js
 *
 * Step 3: Initialize Orchestrator
 *
 * @module mcp/core/initialization/steps/orchestrator-init-step
 */

import { InitializationStep } from './base-step.js';
import { Orchestrator } from '#core/orchestrator.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:orchestrator:init:step');



/**
 * Step 3: Orchestrator Initialization
 */
export class OrchestratorInitStep extends InitializationStep {
  constructor() {
    super('orchestrator-init');
  }

  async execute(server) {
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('STEP 3: Initialize Orchestrator');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    server.orchestrator = new Orchestrator(server.projectPath, {
      enableFileWatcher: true,
      enableWebSocket: false,
      autoStartLLM: false // Already started in Step 1
    });

    await server.orchestrator.initialize();
    logger.info('  ✅ Orchestrator ready');

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
