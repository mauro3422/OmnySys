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

export async function toolsLogic(options = {}) {
  const { silent = false } = options;

  const running = await checkMCP();
  if (!running) {
    return {
      success: false,
      exitCode: 1,
      error: 'MCP Server is not running',
      hint: 'Run: omnysys up'
    };
  }

  try {
    const response = await fetch(`http://localhost:${PORTS.mcp}/tools`);
    const data = await response.json();

    const tools = data.tools.map((tool, i) => ({
      name: tool.name,
      description: TOOL_DESCRIPTIONS[tool.name] || tool.description,
      icon: TOOL_ICONS[i] || '•'
    }));

    return {
      success: true,
      exitCode: 0,
      tools,
      count: tools.length
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      error: `Error fetching tools: ${error.message}`
    };
  }
}

export async function execute() {
  const result = await toolsLogic();

  if (!result.success) {
    log(result.error, 'error');
    if (result.hint) {
      log(result.hint, 'warning');
    }
    return;
  }

  console.log('\n🛠️  Herramientas disponibles:\n');
  result.tools.forEach(tool => {
    console.log(`  ${tool.icon} ${tool.name}`);
    console.log(`     ${tool.description}\n`);
  });
}
