/**
 * @fileoverview Zombie process detection and cleanup for OmnySys proxy.
 * Detects orphaned Node.js processes from previous restarts that weren't
 * cleaned up properly. Prevents memory leaks and port conflicts.
 *
 * SAFETY: Only kills processes whose command line explicitly contains
 * OmnySys/MCP file paths. Will NEVER touch Qwen CLI, VS Code, or other
 * Node.js processes regardless of memory usage.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Patterns that definitively identify OmnySys MCP processes
// Must match the actual file paths, not just keywords
const OMNYSYS_PATTERNS = [
  'mcp-http-proxy.js',
  'mcp-http-server.js',
  'omnysys',
  'omny.js'
];

// Memory thresholds for zombie detection (only for identified OmnySys processes)
const WORKER_MEMORY_THRESHOLD_MB = 350;
const PROXY_MEMORY_THRESHOLD_MB = 50;

function isOmnySysCommand(command = '') {
  return OMNYSYS_PATTERNS.some((pattern) => command.includes(pattern));
}

function parseWindowsTaskList(stdout = '') {
  const lines = stdout.trim().split('\n').filter(Boolean);
  const rows = [];

  for (const line of lines) {
    const match = line.match(/"([^"]+)","(\d+)","[^"]*","[^"]*","([^"]+)"/);
    if (!match) {
      continue;
    }

    const [, name, pid, memoryStr] = match;
    if (name !== 'node.exe') {
      continue;
    }

    rows.push({
      pid: parseInt(pid, 10),
      memoryMB: Math.round(parseInt(memoryStr.replace(/,/g, ''), 10) / 1024)
    });
  }

  return rows;
}

function parseUnixProcessList(stdout = '') {
  const lines = stdout.trim().split('\n').filter(Boolean);
  const rows = [];

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
    if (!match) {
      continue;
    }

    rows.push({
      pid: parseInt(match[1], 10),
      memoryMB: Math.round(parseInt(match[2], 10) / 1024),
      command: match[3] || ''
    });
  }

  return rows;
}

/**
 * Find all Node.js processes related to OmnySys.
 * @returns {Promise<Array<{pid: number, memoryMB: number, command: string}>>}
 */
export async function findOmnySysProcesses() {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH');
      const processes = [];

      for (const row of parseWindowsTaskList(stdout)) {
        const command = await getProcessCommand(row.pid).catch(() => 'unknown');
        if (!isOmnySysCommand(command)) {
          continue;
        }

        processes.push({
          pid: row.pid,
          memoryMB: row.memoryMB,
          command
        });
      }

      return processes;
    }

    const { stdout } = await execAsync('ps -eo pid=,rss=,args=');
    return parseUnixProcessList(stdout)
      .filter((row) => isOmnySysCommand(row.command))
      .map((row) => ({
        pid: row.pid,
        memoryMB: row.memoryMB,
        command: row.command
      }));
  } catch {
    return [];
  }
}

/**
 * Get the command line for a process.
 */
async function getProcessCommand(pid) {
  try {
    if (process.platform !== 'win32') {
      const { stdout } = await execAsync(`ps -o command= -p ${pid}`);
      return stdout.trim() || 'unknown';
    }

    const { stdout } = await execAsync(`wmic process where ProcessId=${pid} get CommandLine /FORMAT:VALUE`);
    const match = stdout.match(/CommandLine=(.+)/);
    return match ? match[1].trim() : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Identify zombie processes:
 * - Workers from previous restarts that are still alive (memory > 350MB)
 * - Orphaned proxies (should only be one proxy running)
 */
export function identifyZombies(processes, currentPid) {
  const zombies = [];
  const proxyProcesses = processes.filter(p => p.command.includes('mcp-http-proxy'));
  const workerProcesses = processes.filter(p => p.command.includes('mcp-http-server'));

  // If there are multiple proxies, all except the current one are zombies
  for (const proxy of proxyProcesses) {
    if (proxy.pid !== currentPid && proxy.memoryMB > 50) {
      zombies.push({
        pid: proxy.pid,
        memoryMB: proxy.memoryMB,
        type: 'orphaned-proxy',
        command: proxy.command
      });
    }
  }

  // Workers with very high memory (>350MB) are likely from old restarts
  // Fresh workers should be <300MB after startup
  for (const worker of workerProcesses) {
    if (worker.memoryMB > 350) {
      zombies.push({
        pid: worker.pid,
        memoryMB: worker.memoryMB,
        type: 'bloated-worker',
        command: worker.command
      });
    }
  }

  return zombies;
}

/**
 * Kill zombie processes gracefully, then force if needed.
 */
export async function killZombies(zombies, logFn = console.log) {
  const results = [];

  for (const zombie of zombies) {
    try {
      if (process.platform === 'win32') {
        await execAsync(`taskkill /PID ${zombie.pid} /T`);
      } else {
        await execAsync(`kill ${zombie.pid}`);
      }
      logFn(`  ✅ Killed zombie PID ${zombie.pid} (${zombie.memoryMB}MB, ${zombie.type})`);
      results.push({ pid: zombie.pid, killed: true, type: zombie.type });
    } catch {
      // Force kill if graceful fails
      try {
        if (process.platform === 'win32') {
          await execAsync(`taskkill /PID ${zombie.pid} /F /T`);
        } else {
          await execAsync(`kill -9 ${zombie.pid}`);
        }
        logFn(`  ✅ Force-killed zombie PID ${zombie.pid} (${zombie.memoryMB}MB, ${zombie.type})`);
        results.push({ pid: zombie.pid, killed: true, type: zombie.type, forceKilled: true });
      } catch (forceError) {
        logFn(`  ❌ Failed to kill zombie PID ${zombie.pid}: ${forceError.message}`);
        results.push({ pid: zombie.pid, killed: false, error: forceError.message, type: zombie.type });
      }
    }
  }

  return results;
}

/**
 * Main cleanup: detect and kill zombies at proxy startup.
 */
export async function cleanupZombieProcesses(currentPid, logFn = console.log) {
  logFn('🔍 Scanning for zombie Node.js processes...');

  const processes = await findOmnySysProcesses();
  const zombies = identifyZombies(processes, currentPid);

  if (zombies.length === 0) {
    logFn('✅ No zombie processes detected');
    return { zombiesFound: 0, zombiesKilled: 0, results: [] };
  }

  logFn(`🧟 Found ${zombies.length} zombie process(es):`);
  for (const z of zombies) {
    logFn(`   - PID ${z.pid} (${z.memoryMB}MB, ${z.type})`);
  }

  const results = await killZombies(zombies, logFn);
  const killed = results.filter(r => r.killed).length;

  logFn(`✅ Cleaned up ${killed}/${zombies.length} zombie(s)`);
  return { zombiesFound: zombies.length, zombiesKilled: killed, results };
}
