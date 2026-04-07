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

/**
 * Find all Node.js processes related to OmnySys.
 * @returns {Promise<Array<{pid: number, memoryMB: number, command: string}>>}
 */
export async function findOmnySysProcesses() {
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH');
    const lines = stdout.trim().split('\n').filter(Boolean);
    const processes = [];

    for (const line of lines) {
      // Parse CSV: "node.exe","1234","Console","1","40,000 K"
      const match = line.match(/"([^"]+)","(\d+)","[^"]*","[^"]*","([^"]+)"/);
      if (match) {
        const [, name, pid, memoryStr] = match;
        if (name === 'node.exe') {
          const memoryKB = parseInt(memoryStr.replace(/,/g, ''));
          const command = await getProcessCommand(parseInt(pid)).catch(() => 'unknown');

          // Only include OmnySys-related processes
          if (command.includes('mcp-http-proxy') ||
              command.includes('mcp-http-server') ||
              command.includes('omnysys') ||
              command.includes('omny.js')) {
            processes.push({
              pid: parseInt(pid),
              memoryMB: Math.round(memoryKB / 1024),
              command
            });
          }
        }
      }
    }

    return processes;
  } catch {
    return [];
  }
}

/**
 * Get the command line for a process.
 */
async function getProcessCommand(pid) {
  try {
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
      // Try graceful shutdown first
      await execAsync(`taskkill /PID ${zombie.pid} /T`);
      logFn(`  ✅ Killed zombie PID ${zombie.pid} (${zombie.memoryMB}MB, ${zombie.type})`);
      results.push({ pid: zombie.pid, killed: true, type: zombie.type });
    } catch {
      // Force kill if graceful fails
      try {
        await execAsync(`taskkill /PID ${zombie.pid} /F /T`);
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
