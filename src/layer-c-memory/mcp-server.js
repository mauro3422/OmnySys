#!/usr/bin/env node

/**
 * OmnySys MCP Server - Stdio Proxy Entry Point
 *
 * Mantiene la conexión stdio con Claude Code viva mientras permite
 * reinicios verdaderos del servidor (nuevo proceso Node.js = ESM cache limpio).
 *
 * Arquitectura:
 *   Claude Code  ←── stdio ──→  [mcp-server.js (proxy)]  ←── IPC + pipes ──→  [mcp-server-worker.js]
 *                                  (nunca muere)                                   (se puede reiniciar)
 *
 * ⚡ CRITICAL: stderr redirect MUST be first to prevent EPIPE on handshake.
 */

import { log } from '../shared/logger-system.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { spawnWorkerProcess } from './worker-spawner.js';
import { shouldPreserveHistoryArtifact } from '#shared/utils/normalize-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const logsDir = path.join(projectRoot, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logFile = path.join(logsDir, 'mcp-server.log');

// Truncate log file at session start so each new MCP session starts clean
fs.writeFileSync(logFile, '');

// Redirect proxy's own stderr to log file
process.stderr.write = function (chunk, encoding, callback) {
  fs.appendFileSync(logFile, chunk);
  if (typeof encoding === 'function') encoding();
  else if (callback) callback();
  return true;
};

// ═══════════════════════════════════════════════════════════════════════════
// Proxy logic — spawn worker and forward stdio
// ═══════════════════════════════════════════════════════════════════════════

const workerPath = path.join(__dirname, 'mcp-server-worker.js');
const projectPath = process.argv[2] || process.cwd();

let child = null;
let pendingStdin = [];
let isRestarting = false;

function spawnWorker() {
  log('Spawning worker...');

  // spawnWorkerProcess already adds workerPath, so only pass projectPath
  const workerArgs = [projectPath];
  child = spawnWorkerProcess(workerPath, workerArgs, {
    extraEnv: ['OMNYSYS_LOGS_SPAWNED=1'],
    stdioConfig: ['pipe', 'pipe', 'pipe', 'ipc']
  });

  log(`Worker PID: ${child.pid}`);

  // Flush buffered stdin to new worker
  for (const chunk of pendingStdin) {
    child.stdin.write(chunk);
  }
  pendingStdin = [];

  // Forward worker stdout → our stdout (MCP JSON-RPC responses to Claude Code)
  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
  });

  // Forward worker stderr → log file
  child.stderr.on('data', (chunk) => {
    fs.appendFileSync(logFile, chunk);
  });

  // Listen for restart signal from worker (sent by restart-server.js tool)
  child.on('message', (msg) => {
    if (msg?.type === 'restart') {
      log(`Restart requested (clearCache=${msg.clearCache}, reanalyze=${msg.reanalyze})`);
      scheduleRestart(msg.clearCache, msg.reanalyze);
    }
  });

  // Auto-restart on unexpected crash
  child.on('exit', (code, signal) => {
    if (!isRestarting) {
      log(`Worker exited unexpectedly (code=${code}, signal=${signal}). Restarting in 1s...`);
      setTimeout(() => spawnWorker(), 1000);
    }
  });

  child.on('error', (err) => {
    log(`Worker spawn error: ${err.message}`);
  });
}

function scheduleRestart(clearCache = false, reanalyze = false) {
  if (isRestarting) return;
  isRestarting = true;

  // Wait for current MCP response to flush before killing worker
  setTimeout(() => {
    log('Sending SIGTERM to worker...');
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }

    setTimeout(() => {
      if (reanalyze) {
        log('🗑️  Reanalyze requested: cleaning up .omnysysdata...');
        const dataDir = path.join(projectPath, '.omnysysdata');
        const toDelete = ['files', 'atoms', 'molecules'];
        const dbFiles = ['omnysys.db', 'omnysys.db-wal', 'omnysys.db-shm', 'index.json', 'atom-versions.json'];
        try {
          for (const dir of toDelete) {
            const fullPath = path.join(dataDir, dir);
            if (fs.existsSync(fullPath)) {
              fs.rmSync(fullPath, { recursive: true, force: true });
            }
          }
          for (const file of dbFiles) {
            if (shouldPreserveHistoryArtifact(file)) continue;
            const fullPath = path.join(dataDir, file);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          }
          log('✅ Deletion complete: project will be fully re-indexed on spawn.');
        } catch (err) {
          log(`⚠️  Failed to clean up dataDir: ${err.message}`);
        }
      }

      isRestarting = false;
      fs.writeFileSync(logFile, '');
      log('Spawning fresh worker (clean ESM cache)...');
      spawnWorker();
    }, 500);
  }, 300);
}

// Forward stdin from Claude Code → worker (buffer if worker not ready)
process.stdin.on('data', (chunk) => {
  if (child && !child.killed && child.stdin.writable) {
    child.stdin.write(chunk);
  } else {
    pendingStdin.push(chunk);
  }
});

process.stdin.on('end', () => {
  log('stdin closed — Claude Code disconnected. Shutting down.');
  if (child && !child.killed) child.kill('SIGTERM');
  process.exit(0);
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('SIGINT received');
  if (child && !child.killed) child.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('SIGTERM received');
  if (child && !child.killed) child.kill('SIGTERM');
  process.exit(0);
});

// ─── Debug terminal (flag: --debug-terminal) ────────────────────────────────
const debugTerminal = process.argv.includes('--debug-terminal') || process.env.OMNYSYS_DEBUG_TERMINAL === '1';
if (debugTerminal) {
  log('🔍 Debug terminal flag detected, opening window...');
  const batPath = path.join(projectRoot, 'src', 'ai', 'scripts', 'mcp-logs.bat');
  if (fs.existsSync(batPath)) {
    log(`📺 Opening debug terminal via ${batPath}`);
    const t = spawn('cmd.exe', ['/c', 'start', batPath], { detached: true, stdio: 'ignore', windowsHide: true });
    t.unref();
  } else {
    log(`📺 Opening debug terminal via PowerShell (${logFile})`);
    const t = spawn('cmd.exe', ['/c', 'start', 'powershell.exe', '-NoExit', '-Command',
      `Get-Content -Path '${logFile}' -Wait -Tail 50`], { detached: true, stdio: 'ignore', windowsHide: true });
    t.on('error', (err) => { log(`❌ Failed to spawn debug terminal: ${err.message}`); });
    t.unref();
  }
}

log(`OmnySys MCP Proxy started. Project: ${projectPath}`);
spawnWorker();
