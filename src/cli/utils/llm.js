import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { LLMService } from '../../services/llm-service/index.js';
import { exists, repoRoot } from './paths.js';

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

export async function isPortInUse(port) {
  try {
    const { stdout } = await execAsync(`netstat -an | findstr ":${port} " | findstr "LISTENING"`, { windowsHide: true });
    return stdout.includes(port.toString());
  } catch {
    return false;
  }
}

export async function ensureLLMAvailable(aiConfig, options = {}) {
  const { required = true, autoStart = true, maxWaitSeconds = 60 } = options;

  const service = await LLMService.getInstance();
  let isAvailable = service.isAvailable();
  let started = false;

  if (isAvailable) {
    const health = await service.client.healthCheck();
    return { available: true, gpu: health.gpu, cpu: health.cpu, started: false };
  }

  if (autoStart && !health.gpu && !health.cpu) {
    console.log('  AI server not running - attempting to start...');

    if (await isBrainServerStarting()) {
      console.log('  AI server is already starting, waiting...');
    } else if (await isPortInUse(8000)) {
      console.log('  Port 8000 is in use, server may be starting...');
    } else {
      console.log('  Starting GPU server...');

      let llmServerPath = path.join(repoRoot, 'src', 'ai', 'scripts', 'brain_gpu.bat');
      if (!(await exists(llmServerPath))) {
        llmServerPath = path.join(process.cwd(), 'src', 'ai', 'scripts', 'brain_gpu.bat');
      }

      if (await exists(llmServerPath)) {
        const llmProcess = spawn('cmd.exe', ['/c', llmServerPath], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
        llmProcess.unref();
        started = true;
      } else {
        console.error(`  Start script not found: ${llmServerPath}`);
      }
    }

    console.log(`  Waiting for server (max ${maxWaitSeconds}s)...`);

    let attempts = 0;
    const maxAttempts = maxWaitSeconds;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await service.checkHealth();
      isAvailable = service.isAvailable();

      if (isAvailable) {
        const health = await service.client.healthCheck();
        console.log('  AI server ready');
        return { available: true, gpu: health.gpu, cpu: health.cpu, started: true };
      }

      attempts++;
      if (attempts % 5 === 0) {
        console.log(`  Still waiting... (${attempts}/${maxAttempts}s)`);
      }
    }

    console.error(`  AI server failed to start after ${maxWaitSeconds} seconds`);
  }

  if (required) {
    console.error('\nNo AI servers available!');
    console.error('\nStart AI server manually:');
    console.error('   src/ai/scripts/brain_gpu.bat');
    console.error('Or run:');
    console.error('   omnysystem ai start gpu\n');
    process.exit(1);
  }

  return { available: false, gpu: false, cpu: false, started };
}

