/**
 * LLM Starter - Inicia el servidor LLM en terminal separada
 * 
 * Ejecuta llama-server.exe directamente (no usa batch para evitar 'pause')
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { LLMClient, loadAIConfig } from '../../ai/llm-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Inicia el servidor LLM si no está corriendo
 * @param {string} omnySystemRoot - Ruta raíz de OmnySystem
 * @returns {Promise<boolean>} - true si está listo o se inició
 */
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
  } catch {
    // Not running, continue
  }
  
  // 2. Clean stale lock file
  const lockFile = path.join(process.env.TEMP, 'omny_brain_gpu.lock');
  try { await fs.unlink(lockFile); } catch {}
  
  // 3. Verify files exist
  const llamaServer = path.join(omnySystemRoot, 'src/ai/server/llama-server.exe');
  const modelPath = path.join(omnySystemRoot, 'src/ai/models/LFM2-1.2B-Extract-Q8_0.gguf');
  
  try {
    await fs.access(llamaServer);
    await fs.access(modelPath);
  } catch (err) {
    console.error('   ❌ llama-server.exe or model not found');
    return false;
  }
  
  // 4. Start llama-server.exe directly in NEW WINDOW
  console.error('   🚀 Starting LLM in new terminal...');
  
  const args = [
    '--model', modelPath,
    '--port', '8000',
    '--host', '127.0.0.1',
    '--n-gpu-layers', '999',
    '--ctx-size', '32768',
    '--parallel', '2',
    '-cb',
    '--temp', '0.0',
    '--cache-type-k', 'q8_0',
    '--cache-type-v', 'q8_0',
    '--chat-template', 'chatml'
  ];
  
  // Use cmd /c start to open new terminal window
  // windowsHide: false = SHOW the window
  // detached: true = Don't wait for it
  const child = spawn('cmd.exe', [
    '/c', 'start', 'CogniSystem LLM Server',
    llamaServer, ...args
  ], {
    cwd: omnySystemRoot,
    detached: true,
    windowsHide: false  // IMPORTANT: Show the window!
  });
  
  // Don't wait, just unref and continue
  child.unref();
  
  console.error('   ✓ Terminal opened: "CogniSystem LLM Server"');
  console.error('   ⏳ LLM loading asynchronously (10-30s)...');
  
  // Return immediately - MCP continues, LLM loads in background
  return true;
}
