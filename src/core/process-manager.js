/**
 * Process Manager
 *
 * Controla todos los procesos del sistema (MCP, LLM, etc)
 * Previene duplicación y permite identificación clara.
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';

const execAsync = promisify(exec);

/**
 * Verifica si un puerto está en uso
 */
export async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

/**
 * Encuentra proceso por puerto
 */
export async function findProcessByPort(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`);
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        return parts[4]; // PID
      }
    }
  } catch {
    // No process found
  }
  return null;
}

/**
 * Mata proceso por PID
 */
export async function killProcess(pid) {
  try {
    await execAsync(`taskkill /F /PID ${pid}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica estado de los servicios
 */
export async function checkServices() {
  const [llmPort, orchestratorPort, wsPort] = await Promise.all([
    isPortInUse(8000),   // LLM Server
    isPortInUse(9999),   // Orchestrator
    isPortInUse(9997)    // WebSocket
  ]);

  return {
    llm: llmPort,
    orchestrator: orchestratorPort,
    websocket: wsPort,
    anyRunning: llmPort || orchestratorPort || wsPort
  };
}

/**
 * Limpia todos los procesos del sistema OmnySys
 */
export async function cleanupProcesses() {
  console.log('🧹 Cleaning up OmnySys processes...\n');

  const services = await checkServices();

  if (services.llm) {
    const pid = await findProcessByPort(8000);
    if (pid) {
      console.log(`  Stopping LLM server (PID: ${pid})...`);
      await killProcess(pid);
    }
  }

  if (services.orchestrator) {
    const pid = await findProcessByPort(9999);
    if (pid) {
      console.log(`  Stopping Orchestrator (PID: ${pid})...`);
      await killProcess(pid);
    }
  }

  if (services.websocket) {
    const pid = await findProcessByPort(9997);
    if (pid) {
      console.log(`  Stopping WebSocket (PID: ${pid})...`);
      await killProcess(pid);
    }
  }

  // Kill any orphaned node processes with "OmnySys" in command line
  try {
    const { stdout } = await execAsync('wmic process where "name=\'node.exe\'" get commandline,processid /format:csv');
    const lines = stdout.split('\n').filter(l => l.includes('OmnySys') && !l.includes('wmic'));
    for (const line of lines) {
      const parts = line.split(',');
      const pid = parts[parts.length - 1]?.trim();
      if (pid && !isNaN(parseInt(pid))) {
        console.log(`  Stopping orphaned process (PID: ${pid})...`);
        await killProcess(pid);
      }
    }
  } catch (e) {
    // Ignore errors
  }

  console.log('\n✅ Cleanup completed\n');
}

/**
 * Inicia el servidor LLM si no está corriendo
 */
export async function startLLMServer(scriptPath) {
  const running = await isPortInUse(8000);
  
  if (running) {
    console.log('✅ LLM Server already running on port 8000');
    return { started: false, wasRunning: true };
  }

  console.log('🚀 Starting LLM Server...');
  
  const process = spawn('cmd.exe', ['/c', 'start', '/min', scriptPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });

  process.unref();

  // Esperar a que esté listo
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 1000));
    const ready = await isPortInUse(8000);
    if (ready) {
      console.log('✅ LLM Server ready\n');
      return { started: true, wasRunning: false };
    }
    attempts++;
    if (attempts % 5 === 0) {
      console.log(`  ⏳ Waiting for LLM server... (${attempts}/${maxAttempts})`);
    }
  }

  throw new Error('LLM Server failed to start within 30 seconds');
}

/**
 * Muestra estado de todos los servicios
 */
export async function printServiceStatus() {
  const services = await checkServices();
  
  console.log('\n📊 Service Status:');
  console.log(`  LLM Server (port 8000):    ${services.llm ? '🟢 Running' : '🔴 Stopped'}`);
  console.log(`  Orchestrator (port 9999):  ${services.orchestrator ? '🟢 Running' : '🔴 Stopped'}`);
  console.log(`  WebSocket (port 9997):     ${services.websocket ? '🟢 Running' : '🔴 Stopped'}`);
  console.log('');
  
  return services;
}

export default {
  isPortInUse,
  findProcessByPort,
  killProcess,
  checkServices,
  cleanupProcesses,
  startLLMServer,
  printServiceStatus
};
