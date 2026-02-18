import { checkLLM, checkMCP } from '../utils/port-checker.js';
import { log } from '../utils/logger.js';

export const aliases = ['status'];

export async function statusLogic(options = {}) {
  const { silent = false } = options;

  try {
    const llm = await checkLLM();
    const mcp = await checkMCP();

    return {
      success: true,
      exitCode: 0,
      services: {
        llm: {
          running: llm,
          port: 8000
        },
        mcp: {
          running: mcp,
          port: 9999,
          toolsAvailable: mcp ? 9 : 0
        }
      },
      allRunning: llm && mcp
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      error: error.message
    };
  }
}

export async function execute() {
  const result = await statusLogic();
  
  console.log('\n╔════════════════════════════════════╗');
  console.log('║      OMNYsys STATUS                ║');
  console.log('╠════════════════════════════════════╣');
  console.log(`║  LLM Server:  ${result.services.llm.running ? '🟢 Running' : '🔴 Stopped'}${' '.repeat(16)}║`);
  console.log(`║  MCP Server:  ${result.services.mcp.running ? '🟢 Running' : '🔴 Stopped'}${' '.repeat(16)}║`);
  console.log(`║  Tools:       ${result.services.mcp.running ? '9 available' : 'N/A'}${' '.repeat(16)}║`);
  console.log('╚════════════════════════════════════╝\n');
  
  if (!result.allRunning) {
    log('Ejecuta: omnysys up', 'warning');
  }
}
