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

import { createCliOrchestrator } from '../shared/cli/base-orchestrator.js';

let serverInstance = null;

const main = createCliOrchestrator({
  name: 'mcp:worker',
  logger: createLogger,
  keepAlive: true,
  onInterrupt: async () => {
    if (serverInstance) await serverInstance.shutdown();
  },
  run: async ({ absolutePath, logger }) => {
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

    serverInstance = new OmnySysMCPServer(absolutePath);

    try {
      await serverInstance.run();
    } catch (error) {
      logger.error('Fatal error:', error);
      await serverInstance.shutdown();
      throw error;
    }
  }
});

main();
