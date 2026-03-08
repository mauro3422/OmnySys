import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
// Deprecated local LLM bootstrap helpers remain for legacy CLI commands.
import { exists, repoRoot } from './paths.js';
import { isPortBound as isPortInUse } from '../../shared/utils/port-probe.js';

const execAsync = promisify(exec);

export async function isBrainServerStarting() {
  try {
    const { stdout } = await execAsync('wmic process where "name=\'cmd.exe\'" get commandline /format:csv 2>nul', { windowsHide: true });
    const gpuBatches = stdout.toLowerCase().split('\n').filter(line =>
      (line.includes('brain_gpu') || line.includes('start_brain_gpu')) && !line.includes('wmic')
    );
    return gpuBatches.length > 0;
  } catch {
    return false;
  }
}

export async function ensureLLMAvailable(aiConfig, options = {}) {
  console.log('[DEPRECATED] Local AI servers are governed by MCP, bypassing CLI start...');
  return { available: false, gpu: false, cpu: false, started: false };
}
