/**
 * @fileoverview Status Command
 * 
 * Show service status
 * 
 * @module cli/commands/status
 */

import { checkLLM, checkMCP } from '../utils/port-checker.js';
import { log } from '../utils/logger.js';

export const aliases = ['status'];

export async function execute() {
  const llm = await checkLLM();
  const mcp = await checkMCP();
  
  console.log('\n╔════════════════════════════════════╗');
  console.log('║      OMNYsys STATUS                ║');
  console.log('╠════════════════════════════════════╣');
  console.log(`║  LLM Server:  ${llm ? '🟢 Running' : '🔴 Stopped'}${' '.repeat(16)}║`);
  console.log(`║  MCP Server:  ${mcp ? '🟢 Running' : '🔴 Stopped'}${' '.repeat(16)}║`);
  console.log(`║  Tools:       ${mcp ? '9 available' : 'N/A'}${' '.repeat(16)}║`);
  console.log('╚════════════════════════════════════╝\n');
  
  if (!llm || !mcp) {
    log('Ejecuta: omnysys up', 'warning');
  }
}
