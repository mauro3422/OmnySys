/**
 * @fileoverview Cleanup Tool - Mata procesos MCP zombie de otros clientes
 * 
 * Cuando clientes como Kimi hacen reconexiones, los MCP servers STDIO
 * (GitHub, Context7, etc.) quedan como zombies. Este tool los limpia.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('mcp:cleanup');
const execAsync = promisify(exec);

async function runCommand(command, options = {}) {
  const { stdout } = await execAsync(command, {
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 1024 * 1024,
    ...options
  });

  return stdout || '';
}

function normalizeProcessList(output) {
  const trimmed = output.trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

/**
 * Encuentra y mata procesos node que no sean OmnySys
 */
export async function cleanup_mcp_zombies(args = {}) {
  const dryRun = args.dryRun || false;
  const killed = [];
  const errors = [];

  try {
    // En Windows, usamos Get-WmiObject para obtener procesos node
    const cmd = `powershell.exe -Command "Get-WmiObject Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId, CommandLine | ConvertTo-Json -Depth 1"`;
    
    let processes;
    try {
      const output = await runCommand(cmd);
      processes = normalizeProcessList(output);
    } catch {
      return {
        success: false,
        message: 'No se pudieron obtener procesos node (posiblemente ninguno en ejecución)',
        killed: [],
        errors: []
      };
    }

    // Proteger procesos de OmnySys
    const protectedPatterns = [
      'mcp-http-proxy.js',
      'mcp-http-server.js',
      'omny.js'
    ];

    for (const proc of processes) {
      if (!proc.CommandLine) continue;

      const isOmnySys = protectedPatterns.some(p => proc.CommandLine.includes(p));
      const isNpxMcp = proc.CommandLine.includes('npx') && 
                       (proc.CommandLine.includes('mcp') || 
                        proc.CommandLine.includes('github') ||
                        proc.CommandLine.includes('context7'));

      if (!isOmnySys && isNpxMcp) {
        const pid = proc.ProcessId;
        try {
          if (!dryRun) {
            await runCommand(`taskkill /F /PID ${pid}`);
            killed.push({ pid, cmd: proc.CommandLine.substring(0, 100) });
            logger.info(`MCP Zombie killed: PID ${pid}`);
          } else {
            killed.push({ pid, cmd: proc.CommandLine.substring(0, 100), dryRun: true });
          }
        } catch (err) {
          errors.push({ pid, error: err.message });
        }
      }
    }

    return {
      success: true,
      dryRun,
      killed: killed.length,
      processes: killed,
      errors: errors.length > 0 ? errors : undefined,
      message: dryRun 
        ? `[DRY RUN] Se encontraron ${killed.length} procesos zombie para matar`
        : `Cleanup completado: ${killed.length} procesos zombie eliminados`
    };

  } catch (error) {
    logger.error(`Error en cleanup: ${error.message}`);
    return {
      success: false,
      message: `Error: ${error.message}`,
      killed: 0,
      errors: [error.message]
    };
  }
}
