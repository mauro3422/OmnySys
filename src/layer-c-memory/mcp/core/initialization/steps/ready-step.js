/**
 * @fileoverview ready-step.js
 *
 * Step 6: Server Ready - Final setup and announcements
 *
 * @module mcp/core/initialization/steps/ready-step
 */

import { InitializationStep } from './base-step.js';

/**
 * Step 6: Server Ready
 */
export class ReadyStep extends InitializationStep {
  constructor() {
    super('ready');
  }

  execute(server) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('✅ MCP Server Ready!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Display available tools
    const { toolDefinitions } = server.server.handlers.ListToolsRequestSchema || { toolDefinitions: [] };
    
    // Categorize and display tools
    this.displayTools();
    
    // Display stats
    const uptime = ((Date.now() - server.startTime) / 1000).toFixed(2);
    console.error(`\n📊 Server stats:`);
    console.error(`   Uptime: ${uptime}s`);
    console.error(`   Cache: ${server.cache?.getRamStats?.().memoryUsage || 'N/A'}`);

    server.initialized = true;
    return true;
  }

  displayTools() {
    // Import here to avoid circular dependencies
    import('../../tools/index.js').then(({ toolDefinitions }) => {
      console.error(`\n🔧 Available tools (${toolDefinitions.length} total):`);

      const categories = {
        'Core Analysis': ['get_impact_map', 'analyze_change', 'explain_connection', 'get_risk_assessment'],
        'Omniscience': ['get_call_graph', 'analyze_signature_change', 'explain_value_flow'],
        'Atomic/Molecular': ['get_function_details', 'get_molecule_summary', 'get_atomic_functions'],
        'Utilities': ['search_files', 'get_server_status', 'restart_server']
      };

      for (const [category, toolNames] of Object.entries(categories)) {
        const tools = toolDefinitions.filter(t => toolNames.includes(t.name));
        if (tools.length > 0) {
          console.error(`\n   ${category}:`);
          tools.forEach(t => console.error(`     • ${t.name}`));
        }
      }
    });
  }
}

export default ReadyStep;
