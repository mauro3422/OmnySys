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
import { LLMClient, loadAIConfig } from '#ai/llm-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:starter');



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
    } catch { }
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
  logger.info('   🔍 Checking LLM status...');

  const aiConfig = await loadAIConfig();
  const client = new LLMClient(aiConfig);

  // 1. Check if already running
  try {
    const health = await client.healthCheck();
    if (health.gpu || health.cpu) {
      const mode = health.gpu ? 'GPU' : 'CPU';
      logger.info(`   ✓ LLM already running on port 8000 (${mode} mode)`);
      return true;
    }
  } catch { }

  if (!aiConfig.llm.enabled) {
    logger.info('   ℹ️  LLM disabled in config');
    return false;
  }

  // 2. Clean stale lock file
  const lockFile = path.join(process.env.TEMP || '/tmp', 'omny_brain_gpu.lock');
  try { await fs.unlink(lockFile); } catch { }

  const mode = aiConfig.llm.mode || 'gpu';
  const scriptPath = path.join(OmnySysRoot, 'src/ai/scripts');

  // 3. Start GPU server if configured
  if (mode === 'gpu' || mode === 'both') {
    const gpuScript = path.join(scriptPath, 'brain_gpu.bat');

    try {
      await fs.access(gpuScript);
      logger.info('   🚀 Starting GPU server...');

      const gpuProcess = spawn('cmd.exe', ['/c', 'start', gpuScript], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      gpuProcess.unref();

      logger.info('   ✓ GPU server starting (port 8000)...');
    } catch {
      logger.info('   ⚠️  GPU script not found');
    }
  }

  // 4. Start CPU server if configured
  if (mode === 'cpu' || mode === 'both') {
    const cpuScript = path.join(scriptPath, 'start_brain_cpu.bat');

    try {
      await fs.access(cpuScript);
      logger.info('   🚀 Starting CPU server...');

      const cpuProcess = spawn('cmd.exe', ['/c', 'start', cpuScript], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      cpuProcess.unref();

      logger.info('   ✓ CPU server starting (port 8002)...');
    } catch {
      logger.info('   ⚠️  CPU script not found');
    }
  }

  // 5. Wait for LLM to be ready
  logger.info('   ⏳ Waiting for LLM to be ready (this may take 10-30s)...');

  const result = await waitForLLM(client, 60, 2000); // 2 min max

  if (result.ready) {
    const activeMode = result.health.gpu ? 'GPU' : 'CPU';
    logger.info(`\n   ✅ LLM is ready! (${activeMode} mode)`);
    return true;
  } else {
    logger.info('\n   ❌ LLM failed to start within 2 minutes');
    logger.info('   💡 Check the terminal windows for errors');
    return false;
  }
}

/**
 * Inicia el servidor LLM en BACKGROUND sin esperar (non-blocking)
 * Usado durante la inicialización del pipeline MCP
 * 
 * @param {string} OmnySysRoot - Ruta raíz del proyecto
 * @returns {Promise<boolean>} - true si se inició el proceso (no garantiza que esté listo)
 */
export async function startLLMBackground(OmnySysRoot) {
  logger.info('   🔍 Checking LLM status...');

  const aiConfig = await loadAIConfig();
  const client = new LLMClient(aiConfig);

  // 1. Check if already running
  try {
    const health = await client.healthCheck();
    if (health.gpu || health.cpu) {
      const mode = health.gpu ? 'GPU' : 'CPU';
      logger.info(`   ✓ LLM already running on port 8000 (${mode} mode)`);
      return true;
    }
  } catch { }

  if (!aiConfig.llm.enabled) {
    logger.info('   ℹ️  LLM disabled in config');
    return false;
  }

  // 2. Clean stale lock file
  const lockFile = path.join(process.env.TEMP || '/tmp', 'omny_brain_gpu.lock');
  try { await fs.unlink(lockFile); } catch { }

  const mode = aiConfig.llm.mode || 'gpu';
  const scriptPath = path.join(OmnySysRoot, 'src/ai/scripts');
  let started = false;

  // 3. Start GPU server if configured
  if (mode === 'gpu' || mode === 'both') {
    const gpuScript = path.join(scriptPath, 'brain_gpu.bat');

    try {
      await fs.access(gpuScript);
      logger.info('   🚀 Starting GPU server...');

      const gpuProcess = spawn('cmd.exe', ['/c', 'start', gpuScript], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      gpuProcess.unref();

      logger.info('   ✓ GPU server starting (port 8000)...');
      started = true;
    } catch {
      logger.info('   ⚠️  GPU script not found');
    }
  }

  // 4. Start CPU server if configured
  if (mode === 'cpu' || mode === 'both') {
    const cpuScript = path.join(scriptPath, 'start_brain_cpu.bat');

    try {
      await fs.access(cpuScript);
      logger.info('   🚀 Starting CPU server...');

      const cpuProcess = spawn('cmd.exe', ['/c', 'start', cpuScript], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      cpuProcess.unref();

      logger.info('   ✓ CPU server starting (port 8002)...');
      started = true;
    } catch {
      logger.info('   ⚠️  CPU script not found');
    }
  }

  // 5. Return immediately - don't wait for LLM to be ready
  if (started) {
    logger.info('   🚀 LLM processes started in background');
    logger.info('   ⏳ Will be ready in 10-30 seconds...');
  }

  return started;
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
