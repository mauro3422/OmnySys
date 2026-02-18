import { checkMCP, PORTS } from '../utils/port-checker.js';
import { log } from '../utils/logger.js';

export const aliases = ['call'];

export async function callLogic(args, options = {}) {
  const { silent = false } = options;
  const [toolName, argsJson = '{}'] = args || [];

  if (!toolName) {
    return {
      success: false,
      exitCode: 1,
      error: 'No tool name specified'
    };
  }

  const running = await checkMCP();
  if (!running) {
    return {
      success: false,
      exitCode: 1,
      error: 'MCP Server is not running',
      hint: 'Run: omnysys up'
    };
  }

  let parsedArgs = {};
  try {
    parsedArgs = JSON.parse(argsJson);
  } catch (parseError) {
    return {
      success: false,
      exitCode: 1,
      error: 'Invalid JSON arguments'
    };
  }

  try {
    const response = await fetch(`http://localhost:${PORTS.mcp}/tools/${toolName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsedArgs)
    });

    const data = await response.json();

    return {
      success: true,
      exitCode: 0,
      toolName,
      args: parsedArgs,
      result: data.result
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      error: `Error executing ${toolName}: ${error.message}`
    };
  }
}

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
