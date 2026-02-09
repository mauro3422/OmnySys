#!/usr/bin/env node

/**
 * OmnySys MCP Server - Entry Point Único
 * 
 * Usa OmnySysMCPServer con MCP SDK oficial
 * Compatible con Claude Desktop, OpenCode, y otros clientes MCP
 * 
 * Usage: node src/layer-c-memory/mcp-server.js /path/to/project
 */

import { OmnySysMCPServer } from './mcp/core/server-class.js';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:mcp:server');



async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const absolutePath = path.resolve(projectPath);

  // --- Log file setup ---
  const projectRoot = path.resolve(__dirname, '../..');
  const logsDir = path.join(projectRoot, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const logFile = path.join(logsDir, 'mcp-server.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  // Intercept console.error to also write to log file
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError(...args);
    const message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    logStream.write(`${message}\n`);
  };

  // --- Spawn MCP logs terminal ---
  const batPath = path.join(projectRoot, 'src', 'ai', 'scripts', 'mcp-logs.bat');
  if (fs.existsSync(batPath)) {
    let logsTerminal;
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows: usar cmd.exe
      logsTerminal = spawn('cmd.exe', ['/c', 'start', '/min', batPath], {
        detached: true,
        stdio: 'ignore'
      });
    } else if (platform === 'darwin') {
      // macOS: usar Terminal.app
      logsTerminal = spawn('osascript', ['-e', `tell application "Terminal" to do script "cd '${projectRoot}' && tail -f logs/mcp-server.log"`], {
        detached: true,
        stdio: 'ignore'
      });
    } else {
      // Linux: usar xterm o gnome-terminal
      const terminalCmd = fs.existsSync('/usr/bin/gnome-terminal') ? 'gnome-terminal' : 'xterm';
      logsTerminal = spawn(terminalCmd, ['--', 'tail', '-f', path.join(projectRoot, 'logs/mcp-server.log')], {
        detached: true,
        stdio: 'ignore'
      });
    }
    
    if (logsTerminal) {
      logsTerminal.unref();
      logger.error('📺 MCP Logs terminal spawned');
    }
  }

  logger.error(`📂 Project: ${absolutePath}`);
  logger.error('🚀 Starting OmnySys MCP Server...\n');

  const server = new OmnySysMCPServer(absolutePath);

  // Cleanup graceful
  process.on('SIGINT', async () => {
    logger.error('\n👋 Received SIGINT, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.error('\n👋 Received SIGTERM, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    logger.error('\n❌ Uncaught exception:', error);
    await server.shutdown();
    process.exit(1);
  });

  try {
    // El servidor se inicializa en background después del handshake MCP
    await server.run();
  } catch (error) {
    logger.error('Fatal error:', error);
    await server.shutdown();
    process.exit(1);
  }
}

main();
