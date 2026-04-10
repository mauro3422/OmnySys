#!/usr/bin/env node
/**
 * Lifecycle helpers for the MCP stdio bridge.
 *
 * Keeps daemon startup/recovery logic isolated from transport wiring so the
 * bridge can remain focused on request forwarding.
 */

import { log } from '../../shared/logger-system.js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    readDaemonOwnerLock,
    waitForDaemonOwner
} from '../../shared/compiler/runtime-ownership.js';
import {
    readDaemonHealth,
    waitForDaemonHealthy,
    waitMs
} from './stdio-bridge-health.js';
import {
    detectHealthyDaemon
} from '../mcp-http-proxy-health.js';
import { buildHealthUrl, buildMcpUrl } from '../../shared/mcp-endpoints.js';

const execAsync = promisify(exec);

const DAEMON_URL = new URL(process.env.OMNYSYS_DAEMON_URL || buildMcpUrl({
    port: 9999,
    env: process.env,
    platform: process.platform
}));
const DAEMON_HEALTH = process.env.OMNYSYS_HEALTH_URL || buildHealthUrl({
    port: 9999,
    env: process.env,
    platform: process.platform
});
const AUTO_START = process.env.OMNYSYS_AUTO_START !== '0';
const PROJECT_PATH = path.resolve(process.env.OMNYSYS_PROJECT_PATH || process.cwd());
const DAEMON_PORT = String(DAEMON_URL.port || '9999');
const DAEMON_READY_TIMEOUT_MS = Number(process.env.OMNYSYS_DAEMON_READY_TIMEOUT_MS || 120000);
const DAEMON_READY_POLL_MS = Number(process.env.OMNYSYS_DAEMON_READY_POLL_MS || 1000);
const START_LOCK_DIR = path.join(PROJECT_PATH, '.omnysysdata');
const START_LOCK_PATH = path.join(START_LOCK_DIR, `daemon-start-${DAEMON_PORT}.lock`);
const START_LOCK_STALE_MS = 30000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export { log };

/**
 * Identifica si un proceso Node.js es un daemon/proxy/bridge de OmnySys
 * @param {string} commandLine - Línea de comando del proceso
 * @param {string} projectPath - Ruta del proyecto para verificar coincidencia
 * @returns {{isOmnySys: boolean, type: string, isSameProject: boolean}}
 */
function identifyOmnySysProcess(commandLine, projectPath) {
    const normalizedProjectPath = projectPath.replace(/\\/g, '/');
    const normalizedCommandLine = commandLine.replace(/\\/g, '/');
    
    // Verificar si es un proceso de OmnySys
    const isProxy = /mcp-http-proxy\.js/.test(normalizedCommandLine);
    const isServer = /mcp-http-server\.js/.test(normalizedCommandLine);
    const isBridge = /mcp-stdio-bridge\.js/.test(normalizedCommandLine);
    
    if (!isProxy && !isServer && !isBridge) {
        return { isOmnySys: false, type: 'unknown', isSameProject: false };
    }
    
    // Determinar el tipo
    let type = 'unknown';
    if (isProxy) type = 'proxy';
    else if (isServer) type = 'daemon';
    else if (isBridge) type = 'bridge';
    
    // Verificar si es del mismo proyecto
    const isSameProject = normalizedCommandLine.includes(normalizedProjectPath);
    
    return { isOmnySys: true, type, isSameProject };
}

function parseWindowsProcessRows(stdout = '') {
  const lines = stdout.split('\n');
  const currentPid = process.pid;
  const rows = [];

  for (const line of lines) {
    const pidMatch = line.match(/,(\d+)\s*$/);
    if (!pidMatch) continue;

    const pid = parseInt(pidMatch[1], 10);
    if (!pid || pid === currentPid) continue;

    rows.push({ pid, commandLine: line.trim() });
  }

  return rows;
}

function parseUnixProcessRows(stdout = '') {
  const lines = stdout.split('\n').filter(Boolean);
  const currentPid = process.pid;
  const rows = [];

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\s+(.*)$/);
    if (!match) continue;

    const pid = parseInt(match[1], 10);
    const commandLine = match[2] || '';
    if (!pid || pid === currentPid || !commandLine) continue;

    rows.push({ pid, commandLine });
  }

  return rows;
}

async function listCandidateProcessRows() {
  if (process.platform === 'win32') {
    const { stdout } = await execAsync(
      'wmic process where "name=\'node.exe\'" get commandline,processid /format:csv',
      { windowsHide: true }
    );
    return parseWindowsProcessRows(stdout);
  }

  const { stdout } = await execAsync('ps -eo pid=,args=');
  return parseUnixProcessRows(stdout);
}

async function terminateProcess(pid) {
  if (process.platform === 'win32') {
    await execAsync(`taskkill /F /PID ${pid}`, { windowsHide: true });
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      throw error;
    }
  }
}

/**
 * Busca procesos Node.js huérfanos del mismo proyecto y los limpia
 * para evitar duplicación de daemons.
 */
async function cleanupOrphanedDaemons() {
  try {
    log('Checking for orphaned daemon processes...');
    const orphanedProcesses = [];
    const rows = await listCandidateProcessRows();

    for (const { pid, commandLine } of rows) {
      // Identificar el tipo de proceso
      const identification = identifyOmnySysProcess(commandLine, PROJECT_PATH);

      // Solo nos interesan los procesos del mismo proyecto que sean proxy o daemon
      if (identification.isOmnySys && identification.isSameProject && 
          (identification.type === 'proxy' || identification.type === 'daemon')) {
        orphanedProcesses.push({ 
          pid, 
          type: identification.type,
          line: commandLine.trim() 
        });
      }
    }
    
    if (orphanedProcesses.length === 0) {
      log('No orphaned daemons found.');
      return;
    }
    
    log(`Found ${orphanedProcesses.length} potential orphaned daemon/proxy process(es):`);
    
    for (const { pid, type } of orphanedProcesses) {
      log(`  - PID ${pid} (${type}) - checking if healthy...`);
      
      // Verificar si el proceso es un daemon healthy de ESTE proyecto
      try {
        const result = await detectHealthyDaemon(parseInt(DAEMON_PORT), PROJECT_PATH);
        
        if (result.healthy && !result.isDifferentProject && result.processInfo?.pid === pid) {
          log(`  ✓ PID ${pid} is a healthy ${type} for this project - keeping it`);
          continue;
        }
        
        if (result.healthy && result.processInfo?.pid !== pid) {
          log(`  ⚠ PID ${pid} is healthy but has different PID (${result.processInfo?.pid}) - may be orphaned`);
        }
      } catch {
        // Si no podemos conectar, probablemente está muerto o no responde
      }
      
      // Si llegamos aquí, el proceso no es healthy o es de otro proyecto
      log(`  ✗ PID ${pid} (${type}) appears to be orphaned or unhealthy - cleaning up`);
      try {
        await terminateProcess(pid);
        log(`  ✓ Successfully terminated PID ${pid}`);
      } catch (killError) {
        log(`  ⚠ Failed to terminate PID ${pid}: ${killError.message}`);
      }
    }
  } catch (error) {
    log(`Warning: Could not check for orphaned daemons: ${error.message}`);
    // No fallar, solo advertir
  }
}

async function checkDaemon() {
    return (await readDaemonHealth(DAEMON_HEALTH)).healthy;
}

async function resolveDaemonEntry() {
    const candidates = [
        path.join(PROJECT_PATH, 'src', 'layer-c-memory', 'mcp-http-proxy.js'),
        path.join(PROJECT_PATH, 'mcp-http-proxy.js'),
        path.join(__dirname, 'mcp-http-proxy.js'),
        path.join(__dirname, '..', '..', 'mcp-http-server.js'),
        path.join(__dirname, 'mcp-http-server.js'),
        path.join(PROJECT_PATH, 'mcp-http-server.js'),
        path.join(PROJECT_PATH, 'src', 'layer-c-memory', 'mcp-http-server.js')
    ];

    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            // try next candidate
        }
    }

    return null;
}

async function ensureStartLockDir() {
    await fs.mkdir(START_LOCK_DIR, { recursive: true });
}

async function releaseStartLock(handle) {
    if (!handle) return;

    try {
        await handle.close();
    } catch {
        // ignore close errors
    }

    try {
        await fs.unlink(START_LOCK_PATH);
    } catch {
        // ignore unlink errors
    }
}

async function waitForExistingOwner(timeoutMs = 20000) {
    const ownerLock = await readDaemonOwnerLock(PROJECT_PATH, DAEMON_PORT);
    if (!ownerLock) {
        return false;
    }
    return await waitForDaemonOwner(PROJECT_PATH, {
        port: DAEMON_PORT,
        checkDaemon,
        timeoutMs,
        log
    });
}

async function acquireStartLock() {
    await ensureStartLockDir();

    try {
        const handle = await fs.open(START_LOCK_PATH, 'wx');
        await handle.writeFile(JSON.stringify({
            pid: process.pid,
            type: 'bridge-auto-start',
            port: DAEMON_PORT,
            projectPath: PROJECT_PATH,
            createdAt: new Date().toISOString(),
            nodeVersion: process.version
        }));
        return handle;
    } catch (error) {
        if (error?.code !== 'EEXIST') {
            throw error;
        }

        try {
            const stats = await fs.stat(START_LOCK_PATH);
            const ageMs = Date.now() - stats.mtimeMs;
            if (ageMs > START_LOCK_STALE_MS) {
                await fs.unlink(START_LOCK_PATH);
                return await acquireStartLock();
            }
        } catch {
            return await acquireStartLock();
        }

        return null;
    }
}

export async function waitForDaemonReady() {
    while (true) {
        const initialHealth = await readDaemonHealth(DAEMON_HEALTH);
        if (!initialHealth.healthy && AUTO_START) {
            const started = await startDaemon();
            if (started) {
                return;
            }

            log('WARN: Daemon auto-start failed. Will keep waiting and retry.');
            log(`Health URL: ${DAEMON_HEALTH}`);
        }

        if (!initialHealth.healthy) {
            log('Waiting for daemon to reach healthy state...');
            const health = await waitForDaemonHealthy(DAEMON_HEALTH, {
                timeoutMs: DAEMON_READY_TIMEOUT_MS,
                pollMs: DAEMON_READY_POLL_MS,
                label: 'daemon',
                log
            });

            if (health?.healthy) {
                return;
            }

            log('WARN: Daemon not reachable yet. Retrying bridge readiness...');
            log(`Health URL: ${DAEMON_HEALTH}`);
            log(`Manual start: ${process.execPath} src/layer-c-memory/mcp-http-proxy.js ${PROJECT_PATH} ${DAEMON_PORT}`);
            await waitMs(Math.max(DAEMON_READY_POLL_MS, 1000));
            continue;
        }

        return;
    }
}

export async function startDaemon() {
    log(`Daemon not running, attempting auto-start for ${PROJECT_PATH}...`);

    if (await checkDaemon()) {
        log('Daemon became healthy before auto-start. Skipping spawn.');
        return true;
    }

    // Limpiar procesos huérfanos ANTES de intentar iniciar
    await cleanupOrphanedDaemons();
    
    // Re-verificar si hay un daemon healthy después de limpieza
    if (await checkDaemon()) {
        log('Daemon became healthy after orphan cleanup. Skipping spawn.');
        return true;
    }

    if (await waitForExistingOwner(DAEMON_READY_TIMEOUT_MS)) {
        return true;
    }

    const startLock = await acquireStartLock();
    if (!startLock) {
        log('Another bridge is already auto-starting the daemon. Waiting for readiness...');
        for (let i = 0; i < 20; i++) {
            await waitMs(500);
            if (await checkDaemon()) {
                log('Daemon became healthy while waiting on start lock.');
                return true;
            }
        }
        log('ERROR: Timed out waiting for another bridge to start the daemon.');
        return false;
    }

    try {
        if (await checkDaemon()) {
            log('Daemon became healthy after acquiring start lock. Skipping spawn.');
            return true;
        }

        if (await waitForExistingOwner(DAEMON_READY_TIMEOUT_MS)) {
            return true;
        }

        const daemonEntry = await resolveDaemonEntry();
        if (!daemonEntry) {
            log('ERROR: Cannot find mcp-http-server.js');
            return false;
        }

        log(`Starting daemon entry: ${daemonEntry}`);

        const daemonProcess = spawn(process.execPath, [
            '--max-old-space-size=8192',
            daemonEntry,
            PROJECT_PATH,
            DAEMON_PORT
        ], {
            cwd: PROJECT_PATH,
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
            env: {
                ...process.env,
                OMNYSYS_MCP_PORT: DAEMON_PORT
            }
        });

        daemonProcess.unref();

        const health = await waitForDaemonHealthy(DAEMON_HEALTH, {
            timeoutMs: DAEMON_READY_TIMEOUT_MS,
            pollMs: DAEMON_READY_POLL_MS,
            label: 'daemon startup',
            log
        });

        if (health?.healthy) {
            log('Daemon started successfully');
            return true;
        }

        log(`ERROR: Daemon failed to reach healthy state within ${Math.round(DAEMON_READY_TIMEOUT_MS / 1000)} seconds`);
        return false;
    } finally {
        await releaseStartLock(startLock);
    }
}

export function createBridgeState(stdioTransport) {
    return {
        stdioTransport,
        httpTransport: null,
        transportBootstrappedSessionlessly: false,
        transportGeneration: 0,
        isReconnecting: false,
        reconnectPromise: null,
        lastSessionId: null,
        pendingRequests: new Map(),
        internalRequests: new Map(),
        cachedInitializeRequest: null,
        cachedInitializeResponse: null,
        cachedInitializedNotification: null,
        localInitializeHandled: false,
        lastDaemonHealth: null,
        lastDaemonHealthAt: null,
        bridgeHealthState: null,
        bridgeRiskLevel: null,
        bridgeWarningReasons: [],
        bridgeWarningSignals: [],
        bridgeHealthSummary: null,
        bridgeHealthRecommendation: null,
        lastDaemonPid: null,
        lastRecoverySignature: null,
        lastRecoveryAt: 0
    };
}

export async function sendBridgeRetryableError(state, id, message, data = {}) {
    if (typeof id === 'undefined') return;

    try {
        await state.stdioTransport.send({
            jsonrpc: '2.0',
            id,
            error: {
                code: -32098,
                message,
                data: {
                    retryable: true,
                    daemonUrl: DAEMON_URL.href,
                    sessionId: state.lastSessionId,
                    ...data
                }
            }
        });
    } catch (err) {
        log(`Failed to send retryable error for request ${id}: ${err.message}`);
    }
}

export async function failBridgePendingRequests(state, reason) {
    const requests = Array.from(state.pendingRequests.values());
    state.pendingRequests.clear();

    for (const request of requests) {
        await sendBridgeRetryableError(
            state,
            request.id,
            reason,
            { interruptedMethod: request.method || 'unknown' }
        );
    }
}
