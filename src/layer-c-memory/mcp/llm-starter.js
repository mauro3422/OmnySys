/**
 * LLM Starter - Inicia el servidor LLM en terminal separada
 * 
 * SSoT: Usa start_brain_gpu.bat (única forma de iniciar LLM)
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
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
  
  // 3. Verify batch file exists
  const gpuScript = path.join(omnySystemRoot, 'src/ai/scripts/start_brain_gpu.bat');
  try {
    await fs.access(gpuScript);
  } catch {
    console.error('   ❌ Batch file not found:', gpuScript);
    return false;
  }
  
  // 4. Start in NEW TERMINAL WINDOW (completely async, non-blocking)
  console.error('   🚀 Starting LLM in new terminal...');
  console.error('   📁 Script:', gpuScript);
  
  // Use exec with start command - non-blocking
  // Escape the path properly for Windows
  const { exec } = await import('child_process');
  const escapedScript = gpuScript.replace(/"/g, '""');
  const command = `start "" "${escapedScript}"`;
  
  exec(command, { cwd: omnySystemRoot }, (err) => {
    if (err) console.error('   ⚠️  LLM start warning:', err.message);
  });
  
  console.error('   ✓ Terminal opened');
  console.error('   ⏳ LLM loading asynchronously...');
  
  // Return immediately - don't block MCP
  return true;
}
