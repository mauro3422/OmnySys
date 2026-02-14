/**
 * @fileoverview Up Command
 * 
 * Start LLM + MCP + configure OpenCode
 * 
 * @module cli/commands/up
 */

import { checkLLM, checkMCP, PORTS } from '../utils/port-checker.js';
import { setupOpenCode } from '../utils/opencode-config.js';
import { log } from '../utils/logger.js';
import { startLLM, startMCP } from '../handlers/process-manager.js';

export const aliases = ['start', 'up'];

export async function execute() {
  log('Iniciando OmnySys...', 'loading');
  
  // LLM
  let llmRunning = await checkLLM();
  if (!llmRunning) {
    log('Iniciando LLM Server...', 'loading');
    llmRunning = await startLLM();
  }
  
  if (llmRunning) {
    log(`LLM Server ready on port ${PORTS.llm}`, 'success');
  } else {
    log('LLM Server failed to start', 'error');
    return;
  }
  
  // MCP
  let mcpRunning = await checkMCP();
  if (!mcpRunning) {
    log('Iniciando MCP Server...', 'loading');
    mcpRunning = await startMCP();
  }
  
  if (mcpRunning) {
    log(`MCP Server ready on port ${PORTS.mcp}`, 'success');
  } else {
    log('MCP Server failed to start', 'error');
    return;
  }
  
  log('\n🚀 OmnySys está listo!', 'success');
  log(`   LLM:  http://localhost:${PORTS.llm}/health`);
  log(`   MCP:  http://localhost:${PORTS.mcp}/health`);
  log(`   Tools: http://localhost:${PORTS.mcp}/tools\n`);
  
  // Auto-configure OpenCode
  const configured = await setupOpenCode();
  if (configured) {
    log('OpenCode configurado automáticamente', 'success');
  }
}
