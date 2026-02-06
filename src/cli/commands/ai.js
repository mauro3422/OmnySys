import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { LLMClient, loadAIConfig } from '../../ai/llm-client.js';
import { exists, repoRoot } from '../utils/paths.js';
import { isBrainServerStarting, isPortInUse } from '../utils/llm.js';
import { showHelp } from '../help.js';

const execAsync = promisify(exec);

export async function ai(subcommand, mode = 'gpu') {
  const validSubcommands = ['start', 'stop', 'status'];
  const validModes = ['gpu', 'cpu', 'both'];

  if (!validSubcommands.includes(subcommand)) {
    console.error(`\nInvalid AI subcommand: ${subcommand}\n`);
    console.log('Valid subcommands: start, stop, status\n');
    showHelp();
    process.exit(1);
  }

  if (subcommand === 'start' && !validModes.includes(mode)) {
    console.error(`\nInvalid mode: ${mode}\n`);
    console.log('Valid modes: gpu, cpu, both\n');
    process.exit(1);
  }

  switch (subcommand) {
    case 'start':
      await aiStart(mode);
      break;
    case 'stop':
      await aiStop();
      break;
    case 'status':
      await aiStatus();
      break;
  }
}

async function aiStart(mode) {
  console.log('\nStarting AI Server(s)\n');

  const scriptPath = path.join(repoRoot, 'src', 'ai', 'scripts');

  try {
    if (mode === 'gpu' || mode === 'both') {
      if (await isBrainServerStarting()) {
        console.log('GPU server is already starting, skipping...');
      } else if (await isPortInUse(8000)) {
        console.log('GPU server already running on port 8000');
      } else {
        console.log('Starting GPU server (Vulkan)...');
        const gpuScript = path.join(scriptPath, 'brain_gpu.bat');
        if (await exists(gpuScript)) {
          spawn('cmd.exe', ['/c', 'start', gpuScript], { detached: true });
          console.log('  GPU server started on port 8000');
        } else {
          console.error(`  Script not found: ${gpuScript}`);
        }
      }
    }

    if (mode === 'cpu' || mode === 'both') {
      console.log('Starting CPU server...');
      const cpuScript = path.join(scriptPath, 'start_brain_cpu.bat');
      if (await exists(cpuScript)) {
        spawn('cmd.exe', ['/c', 'start', cpuScript], { detached: true });
        console.log('  CPU server started on port 8002');
      } else {
        console.error(`  Script not found: ${cpuScript}`);
      }
    }

    console.log('\nServers started in new windows. Use "omnysystem ai status" to check.\n');
    process.exit(0);
  } catch (error) {
    console.error('\nFailed to start servers:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

async function aiStop() {
  console.log('\nStopping AI Servers\n');

  try {
    await execAsync('taskkill /F /IM llama-server.exe 2>nul');
    console.log('  Stopped all AI servers\n');
    process.exit(0);
  } catch (error) {
    console.log('  No AI servers running\n');
    process.exit(0);
  }
}

async function aiStatus() {
  console.log('\nAI Server Status\n');

  try {
    const config = await loadAIConfig();
    const client = new LLMClient(config);
    const health = await client.healthCheck();

    console.log('GPU Server (port 8000):');
    console.log(`  ${health.gpu ? 'RUNNING' : 'OFFLINE'}`);

    if (config.performance.enableCPUFallback) {
      console.log('\nCPU Server (port 8002):');
      console.log(`  ${health.cpu ? 'RUNNING' : 'OFFLINE'}`);
    } else {
      console.log('\nCPU Server: Disabled in config');
    }

    console.log('\nConfiguration:');
    console.log(`  LLM enabled: ${config.llm.enabled ? 'Yes' : 'No'}`);
    console.log(`  Mode: ${config.llm.mode}`);
    console.log(`  Config: ${path.resolve('src/ai/ai-config.json')}`);
    console.log('');

    if (!health.gpu && !health.cpu) {
      console.log('Start servers with: omnysystem ai start [gpu|cpu|both]\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\nStatus check failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

