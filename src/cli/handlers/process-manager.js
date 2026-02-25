/**
 * @fileoverview Process Manager
 * 
 * @module cli/handlers/process-manager
 */

import { spawn, exec } from 'child_process';
import os from 'os';
import path from 'path';
import { PORTS } from '../utils/port-checker.js';
import { repoRoot } from '../utils/paths.js';

const PROCESSES = {
  llm: null,
  mcp: null
};

/**
 * Start LLM server process
 * @returns {Promise<boolean>} Success
 */
export async function startLLM() {
  PROCESSES.llm = spawn('node', ['src/ai/scripts/brain_gpu.js'], {
    detached: true,
    stdio: 'ignore'
  });
  PROCESSES.llm.unref();
  
  // Wait for startup
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const { checkLLM } = await import('../utils/port-checker.js');
    if (await checkLLM()) return true;
  }
  return false;
}

/**
 * Start MCP server process
 * @returns {Promise<boolean>} Success
 */
export async function startMCP() {
  const mcpHttpServerPath = path.join(repoRoot, 'src', 'layer-c-memory', 'mcp-http-server.js');
  PROCESSES.mcp = spawn('node', [mcpHttpServerPath, process.cwd(), String(PORTS.mcp)], {
    detached: true,
    stdio: 'ignore'
  });
  PROCESSES.mcp.unref();
  
  // Wait for startup
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const { checkMCP } = await import('../utils/port-checker.js');
    if (await checkMCP()) return true;
  }
  return false;
}

/**
 * Stop all processes
 */
export function stopAll() {
  if (PROCESSES.llm) {
    PROCESSES.llm.kill();
    PROCESSES.llm = null;
  }
  if (PROCESSES.mcp) {
    PROCESSES.mcp.kill();
    PROCESSES.mcp = null;
  }
  
  // Kill orphan processes
  const platform = os.platform();
  if (platform === 'win32') {
    exec('powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq \'node.exe\' -and $_.CommandLine -match \'mcp-http-server\\.js|brain_gpu\\.js\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"', () => {});
  } else {
    exec('pkill -f "mcp-http-server.js" 2>/dev/null; pkill -f "brain_gpu.js" 2>/dev/null', () => {});
  }
}
