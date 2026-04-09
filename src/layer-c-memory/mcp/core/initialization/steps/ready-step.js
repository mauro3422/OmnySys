/**
 * @fileoverview ready-step.js
 *
 * Step 6: Server Ready - Final setup and announcements
 *
 * @module mcp/core/initialization/steps/ready-step
 */

import { InitializationStep } from './base-step.js';
import { createLogger } from '../../../../../utils/logger.js';
import { buildStartupRegressionSummary } from '#shared/compiler/index.js';

const logger = createLogger('OmnySys:ready:step');



/**
 * Step 6: Server Ready
 */
export class ReadyStep extends InitializationStep {
  constructor() {
    super('ready');
  }

  async execute(server) {
    server.currentInitializationDetail = 'startup-telemetry';
    // Display stats
    const uptime = ((Date.now() - server.startTime) / 1000).toFixed(2);
    const startupTelemetry = buildStartupRegressionSummary({
      totalDurationMs: Date.now() - server.startTime,
      runtimeRestartMode: server.runtimeRestartMode || 'manual',
      proxyManaged: server.proxyManaged === true,
      initializationTimings: server.initializationTimings || [],
      layerA: server.startupLayerAResult || null,
      startupMode: server.runtimeRestartMode === 'auto' ? 'proxy-managed' : 'standalone',
      readyDurationMs: 0
    });
    server.startupTelemetry = startupTelemetry;
    logger.info(`   ✓ Server ready in ${uptime}s`);
    if (startupTelemetry?.state) {
      logger.info(`   ↳ Startup ${startupTelemetry.state}: ${startupTelemetry.summary}`);
    }

    // Categorize and display tools
    server.currentInitializationDetail = 'display-tools';
    await this.displayTools();

    // 📊 Print Diagnostics Dashboard (FINAL initialization output)
    try {
      server.currentInitializationDetail = 'diagnostics-dashboard';
      const { printDiagnosticsDashboard } = await import('../dashboard-reporter.js');
      await printDiagnosticsDashboard(server.projectPath, {
        isFinal: true,
        startupTelemetry: server.startupTelemetry || null
      });
    } catch (err) {
      logger.warn('   ⚠️ Failed to display Diagnostics Dashboard:', err.message);
    }

    server.currentInitializationDetail = 'mark-initialized';
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
