/**
 * @fileoverview Call Command
 * 
 * Execute a tool
 * 
 * @module cli/commands/call
 */

import { checkMCP, PORTS } from '../utils/port-checker.js';
import { log } from '../utils/logger.js';

export const aliases = ['call'];

export async function execute(toolName, argsJson = '{}') {
  if (!toolName) {
    log('Uso: omnysys call <tool-name> [json-args]', 'error');
    return;
  }
  
  const running = await checkMCP();
  if (!running) {
    log('MCP Server no está corriendo', 'error');
    log('Ejecuta: omnysys up', 'warning');
    return;
  }
  
  let args = {};
  try {
    args = JSON.parse(argsJson);
  } catch {
    log('Error: args debe ser JSON válido', 'error');
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:${PORTS.mcp}/tools/${toolName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    
    const data = await response.json();
    console.log('\n📤 Resultado:');
    console.log(JSON.stringify(data.result, null, 2));
  } catch (e) {
    log(`Error al ejecutar ${toolName}: ${e.message}`, 'error');
  }
}
