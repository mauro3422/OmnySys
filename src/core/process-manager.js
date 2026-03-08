/**
 * Process Manager
 *
 * Controla todos los procesos del sistema (MCP, LLM, etc)
 * Previene duplicación y permite identificación clara.
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { createLogger } from '../utils/logger.js';
import { isPortBound as isPortInUse } from '../shared/utils/port-probe.js';

const logger = createLogger('OmnySys:process:manager');


/**
 * Encuentra proceso por puerto
 */
export async function findProcessByPort(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, { windowsHide: true });
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
    await execAsync(`taskkill /F /PID ${pid}`, { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica estado de los servicios
 */
export async function checkServices() {
  try {
    const [orchestratorPort, wsPort] = await Promise.all([
      isPortInUse(9999),   // Orchestrator
      isPortInUse(9997)    // WebSocket
    ]);

    return {
      orchestrator: orchestratorPort,
      websocket: wsPort,
      anyRunning: orchestratorPort || wsPort
    };
  } catch (error) {
    logger.warn(`[CHECK_SERVICES_FALLBACK] ${error.message}`);
    return {
      orchestrator: false,
      websocket: false,
      anyRunning: false,
      error: error.message
    };
  }
}

/**
 * Limpia todos los procesos del sistema OmnySys
 */
export async function cleanupProcesses() {
  logger.info('🧹 Cleaning up OmnySys processes...\n');

  const services = await checkServices();

  if (services.orchestrator) {
    const pid = await findProcessByPort(9999);
    if (pid) {
      logger.info(`  Stopping Orchestrator (PID: ${pid})...`);
      await killProcess(pid);
    }
  }

  if (services.websocket) {
    const pid = await findProcessByPort(9997);
    if (pid) {
      logger.info(`  Stopping WebSocket (PID: ${pid})...`);
      await killProcess(pid);
    }
  }

  // Kill any orphaned node processes with "OmnySys" in command line
  try {
    const { stdout } = await execAsync('wmic process where "name=\'node.exe\'" get commandline,processid /format:csv', { windowsHide: true });
    const lines = stdout.split('\n').filter(l => l.includes('OmnySys') && !l.includes('wmic'));
    for (const line of lines) {
      const parts = line.split(',');
      const pid = parts[parts.length - 1]?.trim();
      if (pid && !isNaN(parseInt(pid))) {
        logger.info(`  Stopping orphaned process (PID: ${pid})...`);
        await killProcess(pid);
      }
    }
  } catch (e) {
    // Ignore errors
  }

  logger.info('\n✅ Cleanup completed\n');
}

/**
 * Muestra estado de todos los servicios
 */
export async function printServiceStatus() {
  const services = await checkServices();

  logger.info('\n📊 Service Status:');
  logger.info(`  Orchestrator (port 9999):  ${services.orchestrator ? '🟢 Running' : '🔴 Stopped'}`);
  logger.info(`  WebSocket (port 9997):     ${services.websocket ? '🟢 Running' : '🔴 Stopped'}`);
  logger.info('');

  return services;
}

export default {
  isPortInUse,
  findProcessByPort,
  killProcess,
  checkServices,
  cleanupProcesses,
  printServiceStatus
};
