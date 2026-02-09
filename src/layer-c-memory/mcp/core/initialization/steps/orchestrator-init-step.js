/**
 * @fileoverview orchestrator-init-step.js
 *
 * Step 3: Initialize Orchestrator
 *
 * @module mcp/core/initialization/steps/orchestrator-init-step
 */

import { InitializationStep } from './base-step.js';
import { Orchestrator } from '#core/orchestrator.js';

/**
 * Step 3: Orchestrator Initialization
 */
export class OrchestratorInitStep extends InitializationStep {
  constructor() {
    super('orchestrator-init');
  }

  async execute(server) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 3: Initialize Orchestrator');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    server.orchestrator = new Orchestrator(server.projectPath, {
      enableFileWatcher: true,
      enableWebSocket: false,
      autoStartLLM: false // Already started in Step 1
    });

    await server.orchestrator.initialize();
    console.error('  ✅ Orchestrator ready');

    return true;
  }

  async rollback(server, error) {
    if (server.orchestrator) {
      await server.orchestrator.stop();
      server.orchestrator = null;
      console.error('  ✅ Orchestrator stopped');
    }
  }
}

export default OrchestratorInitStep;
