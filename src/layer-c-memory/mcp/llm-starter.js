/**
 * LLM Starter - Inicia el servidor LLM en terminal separada
 * 
 * Usa start_brain_gpu.bat existente (SSoT para config)
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { LLMClient, loadAIConfig } from '../../ai/llm-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForLLM(client, maxRetries = 60, retryDelay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const health = await client.healthCheck();
      if (health.gpu || health.cpu) {
        return { ready: true, health };
      }
    } catch {}
    process.stderr.write('.');
    await sleep(retryDelay);
  }
  return { ready: false };
}

export async function startLLM(omnySystemRoot) {
  console.error('   🔍 Checking LLM status...');
  
  const aiConfig = await loadAIConfig();
  const client = new LLMClient(aiConfig);
  
  // 1. Check if already running
  try {
    const health = await client.healthCheck();
    if (health.gpu || health.cpu) {
      console.error('   ✓ LLM already running on port 8000');
      return true;
    }
  } catch {}
  
  // 2. Clean stale lock file
  const lockFile = path.join(process.env.TEMP, 'omny_brain_gpu.lock');
  try { await fs.unlink(lockFile); } catch {}
  
  // 3. Find batch script
  const batchPath = path.join(omnySystemRoot, 'src/ai/scripts/start_brain_gpu.bat');
  
  try {
    await fs.access(batchPath);
  } catch {
    console.error('   ❌ start_brain_gpu.bat not found');
    return false;
  }
  
  // 4. Start batch in NEW terminal window
  console.error('   🚀 Starting LLM server...');
  
  const child = spawn('cmd', ['/c', 'start', 'CogniSystem LLM', 'cmd', '/c', batchPath], {
    cwd: omnySystemRoot,
    detached: true,
    windowsHide: false
  });
  
  child.on('error', (err) => {
    console.error('   ❌ Spawn error:', err.message);
  });
  
  child.unref();
  
  // 5. ESPERAR a que el LLM responda (BLOQUEANTE)
  console.error('   ⏳ Waiting for LLM to be ready (this may take 10-30s)...');
  
  const result = await waitForLLM(client, 60, 2000); // 60 retries × 2s = 2 min max
  
  if (result.ready) {
    const mode = result.health.gpu ? 'GPU' : 'CPU';
    console.error(`   ✅ LLM is ready! (${mode} mode)`);
    return true;
  } else {
    console.error('\n   ❌ LLM failed to start within 2 minutes');
    console.error('   💡 Check the terminal window "CogniSystem LLM" for errors');
    return false;
  }
}
