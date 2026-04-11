import { checkLLM, checkMCP } from '../utils/port-checker.js';
import { getMcpUrl } from '../utils/mcp-standardizer/utils.js';
import { log } from '../utils/logger.js';

export const aliases = ['status'];

/**
 * @omny_side_effect reads_daemon_status
 * @description Consulta el estado actual del daemon y las sesiones activas.
 */
export async function statusLogic(options = {}) {
  const { silent = false } = options;

  try {
    const llm = await checkLLM();
    const mcp = await checkMCP();
    let toolsAvailable = 0;

    if (mcp) {
      try {
        const response = await fetch(`${getMcpUrl().replace('/mcp', '')}/tools`);
        const payload = await response.json();
        toolsAvailable = Array.isArray(payload?.tools)
          ? payload.tools.length
          : typeof payload?.count === 'number'
            ? payload.count
            : 0;
      } catch {
        toolsAvailable = 0;
      }
    }

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
          toolsAvailable
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

  const mcpHealth = typeof result.services.mcp.running === 'object' ? result.services.mcp.running : null;
  const mcpStatus = mcpHealth ? `🟢 ${mcpHealth.status}` : (result.services.mcp.running ? '🟢 Running' : '🔴 Stopped');
  const sessions = mcpHealth ? `${mcpHealth.sessions} active` : 'N/A';

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║      OMNYsys STATUS                ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  LLM Server:  ${result.services.llm.running ? '🟢 Running' : '🔴 Stopped'}${' '.repeat(16)}║`);
  console.log(`║  MCP Server:  ${mcpStatus}${' '.repeat(27 - mcpStatus.length)}║`);
  console.log(`║  Sessions:    ${sessions}${' '.repeat(26 - sessions.length)}║`);
  console.log(`║  Tools:       ${result.services.mcp.running ? `${result.services.mcp.toolsAvailable} available` : 'N/A'}${' '.repeat(15)}║`);
  console.log('╚════════════════════════════════════════╝\n');

  if (!result.allRunning) {
    log('Ejecuta: omnysys up', 'warning');
  }
}
