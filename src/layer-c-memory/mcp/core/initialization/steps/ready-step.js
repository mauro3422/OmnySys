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

  async execute(server) {
    // Display stats
    const uptime = ((Date.now() - server.startTime) / 1000).toFixed(2);
    logger.info(`   ✓ Server ready in ${uptime}s`);

    // Categorize and display tools
    await this.displayTools();

    // 📊 Print Diagnostics Dashboard (FINAL initialization output)
    try {
      const { printDiagnosticsDashboard } = await import('../dashboard-reporter.js');
      await printDiagnosticsDashboard(server.projectPath);
    } catch (err) {
      logger.warn('   ⚠️ Failed to display Diagnostics Dashboard:', err.message);
    }

    server.initialized = true;
    return true;
  }

  async displayTools() {
    try {
      // Import here to avoid circular dependencies
      const { toolDefinitions } = await import('../../../tools/index.js');
      logger.info(`   ✓ ${toolDefinitions.length} MCP tools registered`);
    } catch (err) {
      logger.warn('   ⚠️ Failed to load tool definitions for display:', err.message);
    }
  }
}

export default ReadyStep;
