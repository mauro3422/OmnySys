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
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('✅ MCP Server Ready!');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Categorize and display tools
    this.displayTools();
    
    // Display stats
    const uptime = ((Date.now() - server.startTime) / 1000).toFixed(2);
    logger.info(`\n📊 Server stats:`);
    logger.info(`   Uptime: ${uptime}s`);
    logger.info(`   Cache: ${server.cache?.getRamStats?.().memoryUsage || 'N/A'}`);

    server.initialized = true;
    return true;
  }

  displayTools() {
    // Import here to avoid circular dependencies
    import('../../../tools/index.js').then(({ toolDefinitions }) => {
      logger.info(`\n🔧 Available tools (${toolDefinitions.length} total):`);

      const categories = {
        'Core Analysis': ['get_impact_map', 'analyze_change', 'explain_connection', 'get_risk_assessment'],
        'Omniscience': ['get_call_graph', 'analyze_signature_change', 'explain_value_flow'],
        'Atomic/Molecular': ['get_function_details', 'get_molecule_summary', 'get_atomic_functions'],
        'Utilities': ['search_files', 'get_server_status', 'restart_server']
      };

      for (const [category, toolNames] of Object.entries(categories)) {
        const tools = toolDefinitions.filter(t => toolNames.includes(t.name));
        if (tools.length > 0) {
          logger.info(`\n   ${category}:`);
          tools.forEach(t => logger.info(`     • ${t.name}`));
        }
      }
    });
  }
}

export default ReadyStep;
