/**
 * @fileoverview llm-starter.js
 * 
 * Inicia el servidor LLM (GPU y/o CPU) y espera a que esté listo.
 * 
 * @module mcp/core/llm-starter
 */

import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { LLMClient, loadAIConfig } from '../../../ai/llm-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Espera a que el LLM esté listo (health check)
 */
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

/**
 * Inicia el servidor LLM (GPU y/o CPU según configuración)
 * 
 * @param {string} OmnySysRoot - Ruta raíz del proyecto
 * @returns {Promise<boolean>} - true si está listo
 */
export async function startLLM(OmnySysRoot) {
  console.error('   🔍 Checking LLM status...');
  
  const aiConfig = await loadAIConfig();
  const client = new LLMClient(aiConfig);
  
  // 1. Check if already running
  try {
    const health = await client.healthCheck();
    if (health.gpu || health.cpu) {
      const mode = health.gpu ? 'GPU' : 'CPU';
      console.error(`   ✓ LLM already running on port 8000 (${mode} mode)`);
      return true;
    }
  } catch {}
  
  if (!aiConfig.llm.enabled) {
    console.error('   ℹ️  LLM disabled in config');
    return false;
  }
  
  // 2. Clean stale lock file
  const lockFile = path.join(process.env.TEMP || '/tmp', 'omny_brain_gpu.lock');
  try { await fs.unlink(lockFile); } catch {}
  
  const mode = aiConfig.llm.mode || 'gpu';
  const scriptPath = path.join(OmnySysRoot, 'src/ai/scripts');
  
  // 3. Start GPU server if configured
  if (mode === 'gpu' || mode === 'both') {
    const gpuScript = path.join(scriptPath, 'brain_gpu.bat');
    
    try {
      await fs.access(gpuScript);
      console.error('   🚀 Starting GPU server...');
      
      const gpuProcess = spawn('cmd.exe', ['/c', 'start', '/min', gpuScript], {
        detached: true,
        stdio: 'ignore'
      });
      gpuProcess.unref();
      
      console.error('   ✓ GPU server starting (port 8000)...');
    } catch {
      console.error('   ⚠️  GPU script not found');
    }
  }
  
  // 4. Start CPU server if configured
  if (mode === 'cpu' || mode === 'both') {
    const cpuScript = path.join(scriptPath, 'start_brain_cpu.bat');
    
    try {
      await fs.access(cpuScript);
      console.error('   🚀 Starting CPU server...');
      
      const cpuProcess = spawn('cmd.exe', ['/c', 'start', '/min', cpuScript], {
        detached: true,
        stdio: 'ignore'
      });
      cpuProcess.unref();
      
      console.error('   ✓ CPU server starting (port 8002)...');
    } catch {
      console.error('   ⚠️  CPU script not found');
    }
  }
  
  // 5. Wait for LLM to be ready
  console.error('   ⏳ Waiting for LLM to be ready (this may take 10-30s)...');
  
  const result = await waitForLLM(client, 60, 2000); // 2 min max
  
  if (result.ready) {
    const activeMode = result.health.gpu ? 'GPU' : 'CPU';
    console.error(`\n   ✅ LLM is ready! (${activeMode} mode)`);
    return true;
  } else {
    console.error('\n   ❌ LLM failed to start within 2 minutes');
    console.error('   💡 Check the terminal windows for errors');
    return false;
  }
}

/**
 * Verifica si el LLM está disponible sin intentar iniciarlo
 */
export async function checkLLMStatus() {
  try {
    const aiConfig = await loadAIConfig();
    const client = new LLMClient(aiConfig);
    const health = await client.healthCheck();
    return {
      available: health.gpu || health.cpu,
      gpu: health.gpu,
      cpu: health.cpu
    };
  } catch {
    return { available: false, gpu: false, cpu: false };
  }
}
