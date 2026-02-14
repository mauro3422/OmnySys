/**
 * @fileoverview Tools Command
 * 
 * List available tools
 * 
 * @module cli/commands/tools
 */

import { checkMCP, PORTS } from '../utils/port-checker.js';
import { log } from '../utils/logger.js';

export const aliases = ['tools'];

const TOOL_ICONS = ['🔍', '🔧', '🔗', '⚠️', '📁', '📊', '🧠', '🔬', '🌊'];

const TOOL_DESCRIPTIONS = {
  get_impact_map: 'Returns a complete impact map for a file',
  analyze_change: 'Analyzes the impact of changing a specific symbol',
  explain_connection: 'Explains why two files are connected',
  get_risk_assessment: 'Returns a risk assessment of the entire project',
  search_files: 'Search for files in the project by pattern',
  get_server_status: 'Returns the complete status of the OmnySys server',
  get_call_graph: 'Shows ALL call sites of a symbol - who calls what, where, and how',
  analyze_signature_change: 'Predicts breaking changes if you modify a function signature',
  explain_value_flow: 'Shows data flow: inputs → symbol → outputs → consumers'
};

export async function execute() {
  const running = await checkMCP();
  if (!running) {
    log('MCP Server no está corriendo', 'error');
    log('Ejecuta: omnysys up', 'warning');
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:${PORTS.mcp}/tools`);
    const data = await response.json();
    
    console.log('\n🛠️  Herramientas disponibles:\n');
    data.tools.forEach((tool, i) => {
      const icon = TOOL_ICONS[i] || '•';
      console.log(`  ${icon} ${tool.name}`);
      console.log(`     ${TOOL_DESCRIPTIONS[tool.name] || tool.description}\n`);
    });
  } catch (e) {
    log('Error al obtener herramientas', 'error');
  }
}
