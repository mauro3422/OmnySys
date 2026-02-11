/**
 * @fileoverview ready-step.js
 *
 * Step 6: Server Ready - Final setup and announcements
 *
 * @module mcp/core/initialization/steps/ready-step
 */

import { InitializationStep } from './base-step.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:ready:step');



/**
 * Step 6: Server Ready
 */
export class ReadyStep extends InitializationStep {
  constructor() {
    super('ready');
  }

  execute(server) {
    // Display stats
    const uptime = ((Date.now() - server.startTime) / 1000).toFixed(2);
    logger.info(`   ✓ Server ready in ${uptime}s`);

    // Categorize and display tools
    this.displayTools();

    server.initialized = true;
    return true;
  }

  displayTools() {
    // Import here to avoid circular dependencies
    import('../../../tools/index.js').then(({ toolDefinitions }) => {
      logger.info(`   ✓ ${toolDefinitions.length} MCP tools registered`);
    });
  }
}

export default ReadyStep;
