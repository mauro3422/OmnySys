import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { loadAIConfig } from '../../ai/llm-client.js';
import { LLMService } from '../../services/llm-service/index.js';
import { exists, repoRoot } from '../utils/paths.js';
import { isBrainServerStarting, isPortInUse } from '../utils/llm.js';
import { showHelp } from '../help.js';

const execAsync = promisify(exec);

const VALID_SUBCOMMANDS = ['start', 'stop', 'status'];
const VALID_MODES = ['gpu', 'cpu', 'both'];

export async function aiLogic(args, options = {}) {
  const { silent = false } = options;
  const [subcommand, mode = 'gpu'] = args || [];

  if (!VALID_SUBCOMMANDS.includes(subcommand)) {
    return {
      success: false,
      exitCode: 1,
      error: `Invalid AI subcommand: ${subcommand}`,
      validSubcommands: VALID_SUBCOMMANDS
    };
  }

  if (subcommand === 'start' && !VALID_MODES.includes(mode)) {
    return {
      success: false,
      exitCode: 1,
      error: `Invalid mode: ${mode}`,
      validModes: VALID_MODES
    };
  }

  switch (subcommand) {
    case 'start':
      return await aiStartLogic(mode, options);
    case 'stop':
      return await aiStopLogic(options);
    case 'status':
      return await aiStatusLogic(options);
  }
}

async function aiStartLogic(mode, options = {}) {
  const { silent = false } = options;
  const scriptPath = path.join(repoRoot, 'src', 'ai', 'scripts');

  try {
    const servers = { gpu: null, cpu: null };
    const messages = [];

    if (mode === 'gpu' || mode === 'both') {
      if (await isBrainServerStarting()) {
        messages.push('GPU server is already starting');
        servers.gpu = { status: 'starting' };
      } else if (await isPortInUse(8000)) {
        messages.push('GPU server already running on port 8000');
        servers.gpu = { status: 'running', port: 8000 };
      } else {
        const gpuScript = path.join(scriptPath, 'brain_gpu.bat');
        if (await exists(gpuScript)) {
          spawn('cmd.exe', ['/c', 'start', gpuScript], { detached: true });
          messages.push('GPU server started on port 8000');
          servers.gpu = { status: 'started', port: 8000 };
        } else {
          messages.push(`Script not found: ${gpuScript}`);
          servers.gpu = { status: 'error', error: 'Script not found' };
        }
      }
    }

    if (mode === 'cpu' || mode === 'both') {
      const cpuScript = path.join(scriptPath, 'start_brain_cpu.bat');
      if (await exists(cpuScript)) {
        spawn('cmd.exe', ['/c', 'start', cpuScript], { detached: true });
        messages.push('CPU server started on port 8002');
        servers.cpu = { status: 'started', port: 8002 };
      } else {
        messages.push(`Script not found: ${cpuScript}`);
        servers.cpu = { status: 'error', error: 'Script not found' };
      }
    }

    return {
      success: true,
      exitCode: 0,
      mode,
      servers,
      messages
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      error: error.message
    };
  }
}

async function aiStopLogic(options = {}) {
  try {
    await execAsync('taskkill /F /IM llama-server.exe 2>nul');
    return {
      success: true,
      exitCode: 0,
      message: 'Stopped all AI servers'
    };
  } catch (error) {
    return {
      success: true,
      exitCode: 0,
      message: 'No AI servers running'
    };
  }
}

async function aiStatusLogic(options = {}) {
  const { silent = false } = options;

  try {
    const config = await loadAIConfig();
    const service = await LLMService.getInstance();
    await service.checkHealth();
    
    const health = await service.client?.healthCheck() || { gpu: false, cpu: false };
    const metrics = service.getMetrics();

    return {
      success: true,
      exitCode: 0,
      health: {
        gpu: health.gpu,
        cpu: health.cpu,
        cpuEnabled: config.performance.enableCPUFallback
      },
      config: {
        llmEnabled: config.llm.enabled,
        mode: config.llm.mode,
        configPath: path.resolve('src/ai/ai-config.json')
      },
      metrics: {
        circuitBreakerState: metrics.circuitBreakerState,
        availability: metrics.availability,
        requestsTotal: metrics.requestsTotal,
        latencyMsAvg: metrics.latencyMsAvg,
        successRate: metrics.requestsTotal > 0 
          ? Math.round((metrics.requestsSuccessful / metrics.requestsTotal) * 100)
          : 0
      }
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      error: error.message
    };
  }
}

export async function ai(subcommand, mode = 'gpu') {
  const result = await aiLogic([subcommand, mode]);

  if (!result.success) {
    console.error(`\n${result.error}\n`);
    if (result.validSubcommands) {
      console.log(`Valid subcommands: ${result.validSubcommands.join(', ')}\n`);
    }
    if (result.validModes) {
      console.log(`Valid modes: ${result.validModes.join(', ')}\n`);
    }
    showHelp();
    process.exit(1);
  }

  if (result.messages) {
    console.log('\nStarting AI Server(s)\n');
    result.messages.forEach(msg => console.log(`  ${msg}`));
    console.log('\nServers started in new windows. Use "omnysystem ai status" to check.\n');
  }

  if (result.message) {
    console.log('\nStopping AI Servers\n');
    console.log(`  ${result.message}\n`);
  }

  if (result.health) {
    console.log('\nAI Server Status\n');
    console.log(`GPU Server (port 8000):`);
    console.log(`  ${result.health.gpu ? 'RUNNING' : 'OFFLINE'}`);
    if (result.health.cpuEnabled) {
      console.log('\nCPU Server (port 8002):');
      console.log(`  ${result.health.cpu ? 'RUNNING' : 'OFFLINE'}`);
    } else {
      console.log('\nCPU Server: Disabled in config');
    }
    console.log('\nConfiguration:');
    console.log(`  LLM enabled: ${result.config.llmEnabled ? 'Yes' : 'No'}`);
    console.log(`  Mode: ${result.config.mode}`);
    console.log(`  Config: ${result.config.configPath}`);
    console.log('\nService Metrics:');
    console.log(`  Circuit Breaker: ${result.metrics.circuitBreakerState}`);
    console.log(`  Availability: ${result.metrics.availability ? 'Yes' : 'No'}`);
    if (result.metrics.requestsTotal > 0) {
      console.log(`  Avg Latency: ${Math.round(result.metrics.latencyMsAvg)}ms`);
      console.log(`  Success Rate: ${result.metrics.successRate}%`);
    }
    console.log('');
    if (!result.health.gpu && !result.health.cpu) {
      console.log('Start servers with: omnysystem ai start [gpu|cpu|both]\n');
    }
  }

  process.exit(result.exitCode);
}
