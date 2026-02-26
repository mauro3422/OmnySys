#!/usr/bin/env node

/**
 * OmnySys MCP Server - Worker Process
 *
 * Este archivo contiene la lógica real del servidor MCP.
 * Es ejecutado como proceso hijo por mcp-server.js (proxy).
 *
 * Ventaja: cuando el proxy hace restart, spawna un nuevo proceso Node.js
 * con ESM cache limpio — todos los módulos se recargan desde disco.
 *
 * Señalar restart: process.send({ type: 'restart', clearCache: bool })
 * El proxy mata este proceso y spawna uno nuevo.
 *
 * ⚡ NOTA: stderr NO necesita redirección aquí.
 * El proxy captura child.stderr y lo escribe al log file.
 * Solo stdout se usa para MCP JSON-RPC (no hay riesgo de EPIPE).
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import { OmnySysMCPServer } from './mcp/core/server-class.js';
import { createLogger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const logger = createLogger('OmnySys:mcp:worker');

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const absolutePath = path.isAbsolute(projectPath)
    ? path.normalize(projectPath)
    : path.resolve(projectPath);

  // --- Spawn MCP logs terminal (solo si no fue lanzado ya por el proxy) ---
  // El proxy pasa OMNYSYS_LOGS_SPAWNED=1 para evitar duplicar la terminal
  if (!process.env.OMNYSYS_LOGS_SPAWNED) {
    const batPath = path.join(projectRoot, 'src', 'ai', 'scripts', 'mcp-logs.bat');
    if (fs.existsSync(batPath)) {
      let logsTerminal;
      const platform = os.platform();

      if (platform === 'win32') {
        logsTerminal = spawn('cmd.exe', ['/c', 'start', batPath], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
      } else if (platform === 'darwin') {
        logsTerminal = spawn('osascript', ['-e', `tell application "Terminal" to do script "cd '${projectRoot}' && tail -f logs/mcp-server.log"`], {
          detached: true,
          stdio: 'ignore'
        });
      } else {
        const terminalCmd = fs.existsSync('/usr/bin/gnome-terminal') ? 'gnome-terminal' : 'xterm';
        logsTerminal = spawn(terminalCmd, ['--', 'tail', '-f', path.join(projectRoot, 'logs/mcp-server.log')], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
      }

      if (logsTerminal) {
        logsTerminal.unref();
        logger.info('📺 MCP Logs terminal spawned');
      }
    }
  }

  logger.info(`📂 Project: ${absolutePath}`);
  logger.info('🚀 Starting OmnySys MCP Server (worker)...\n');

  const server = new OmnySysMCPServer(absolutePath);

  process.on('SIGINT', async () => {
    logger.info('\n👋 Worker SIGINT, shutting down...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('\n👋 Worker SIGTERM, shutting down...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    const isEpipe = error.code === 'EPIPE' ||
      (error.message && error.message.includes('EPIPE')) ||
      (error.message && error.message.includes('broken pipe'));

    if (isEpipe) {
      logger.debug('⚠️  EPIPE ignored (client disconnected)');
      return;
    }

    logger.error('\n❌ Uncaught exception:', error);
    await server.shutdown();
    process.exit(1);
  });

  try {
    await server.run();
  } catch (error) {
    logger.error('Fatal error:', error);
    await server.shutdown();
    process.exit(1);
  }
}

main();
