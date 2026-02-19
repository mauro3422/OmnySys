#!/usr/bin/env node

/**
 * OmnySys MCP Server - Entry Point Único
 *
 * Usa OmnySysMCPServer con MCP SDK oficial
 * Compatible con Claude Desktop, OpenCode, y otros clientes MCP
 *
 * Usage: node src/layer-c-memory/mcp-server.js /path/to/project
 *
 * ⚡ CRITICAL FIX: This file redirects stderr to a log file BEFORE any imports
 *    to prevent EPIPE errors with MCP stdio transport. DO NOT move the stderr
 *    redirect code below - it must execute FIRST.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 STEP 1: Redirect stderr to file BEFORE ANY OTHER CODE
// ═══════════════════════════════════════════════════════════════════════════
// This MUST be the first code that runs to prevent EPIPE errors.
// MCP SDK uses stdio (stdin/stdout) for JSON communication. If stderr receives
// any output during the handshake, it can cause "EPIPE: broken pipe" errors.

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const logsDir = path.join(projectRoot, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFile = path.join(logsDir, 'mcp-server.log');

// Truncate log file at session start so each new MCP session starts clean
fs.writeFileSync(logFile, '');

// Redirect ALL stderr writes to the log file
// This includes console.error(), logger.info(), and any other stderr output
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = function(chunk, encoding, callback) {
  // Write to file instead of stderr pipe
  fs.appendFileSync(logFile, chunk);

  // Call callback if provided (handling different signatures)
  if (typeof encoding === 'function') {
    encoding(); // encoding is actually the callback
  } else if (callback) {
    callback();
  }
  return true;
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 STEP 2: NOW import modules (logging is now safe)
// ═══════════════════════════════════════════════════════════════════════════

import { OmnySysMCPServer } from './mcp/core/server-class.js';
import { spawn } from 'child_process';
import os from 'os';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:mcp:server');



async function main() {
  const projectPath = process.argv[2] || process.cwd();
  // FIX: Use normalize instead of resolve to avoid path duplication
  // path.resolve() can duplicate paths on Windows if cwd is inside the target
  const absolutePath = path.isAbsolute(projectPath)
    ? path.normalize(projectPath)
    : path.resolve(projectPath);

  // --- Spawn MCP logs terminal ---
  const batPath = path.join(projectRoot, 'src', 'ai', 'scripts', 'mcp-logs.bat');
  if (fs.existsSync(batPath)) {
    let logsTerminal;
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows: abrir terminal VISIBLE con logs
      logsTerminal = spawn('cmd.exe', ['/c', 'start', batPath], {
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
      logger.info('📺 MCP Logs terminal spawned');
    }
  }

  logger.info(`📂 Project: ${absolutePath}`);
  logger.info('🚀 Starting OmnySys MCP Server...\n');

  const server = new OmnySysMCPServer(absolutePath);

  // Cleanup graceful
  process.on('SIGINT', async () => {
    logger.info('\n👋 Received SIGINT, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('\n👋 Received SIGTERM, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    // Ignore EPIPE errors - they occur when client disconnects unexpectedly
    // This is normal behavior for MCP stdio transport and should not crash the server
    const isEpipe = error.code === 'EPIPE' || 
                    (error.message && error.message.includes('EPIPE')) ||
                    (error.message && error.message.includes('broken pipe'));
    
    if (isEpipe) {
      logger.debug('⚠️  EPIPE ignored (client disconnected)');
      return; // Don't crash on EPIPE
    }

    logger.error('\n❌ Uncaught exception:', error);
    await server.shutdown();
    process.exit(1);
  });

  try {
    // El servidor se inicializa en background después del handshake MCP
    await server.run();
  } catch (error) {
    logger.info('Fatal error:', error);
    await server.shutdown();
    process.exit(1);
  }
}

main();
