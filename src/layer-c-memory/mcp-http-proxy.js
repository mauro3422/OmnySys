#!/usr/bin/env node

/**
 * OmnySys MCP HTTP Proxy - True Restart Manager
 *
 * Wraps mcp-http-server.js as a child process (IPC).
 * When restart_server is called, sends SIGTERM to the worker and respawns it
 * — fresh Node.js ESM cache — without killing the proxy or the port.
 *
 * Architecture:
 *   IDE ←── HTTP :9999 ──→ [mcp-http-server.js (worker, IPC child)]
 *                                     ↑ spawned/killed by ↓
 *                          [mcp-http-proxy.js (this, parent, never dies)]
 *
 * Usage (replace IDE task):
 *   node src/layer-c-memory/mcp-http-proxy.js [projectPath] [port]
 *
 * Restart flow:
 *   1. restart_server tool calls process.send({ type: 'restart' })
 *   2. Proxy receives IPC message, waits 300ms for tool response to flush
 *   3. Sends SIGTERM to worker → worker shuts down (releases port 9999)
 *   4. Proxy spawns new worker → fresh ESM cache → binds port 9999 again
 *   5. IDE reconnects automatically (OmnySys has 2s reconnect logic)
 *
 * ⚡ NOTE: The IDE may show a brief "reconnecting" state during the 1-2s
 *    between SIGTERM and the new worker's port bind. This is normal.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// ── Logging ─────────────────────────────────────────────────────────────────
const logsDir = path.join(projectRoot, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logFile = path.join(logsDir, 'mcp-http-proxy.log');
fs.writeFileSync(logFile, ''); // Fresh log each session

function log(msg) {
    const ts = new Date().toISOString().slice(11, 23);
    const line = `[proxy] ${ts} ${msg}\n`;
    fs.appendFileSync(logFile, line);
    process.stdout.write(line); // Also show in IDE task terminal
}

// ── Config ───────────────────────────────────────────────────────────────────
const workerPath = path.join(__dirname, 'mcp-http-server.js');
const projectPath = process.argv[2] || process.cwd();
const port = process.argv[3] || process.env.OMNYSYS_MCP_PORT || '9999';

let worker = null;
let restartScheduled = false;
let restartCount = 0;

// ── Spawn Worker ─────────────────────────────────────────────────────────────
function spawnWorker() {
    log(`Spawning mcp-http-server.js (restart #${restartCount})...`);

    // Inherit memory flags, add defaults
    const execArgv = process.execArgv.filter(a =>
        a.startsWith('--max-old-space-size') || a.startsWith('--inspect') || a === '--expose-gc'
    );
    if (!execArgv.some(a => a.startsWith('--max-old-space-size'))) {
        execArgv.push('--max-old-space-size=8192');
    }
    if (!execArgv.includes('--expose-gc')) {
        execArgv.push('--expose-gc');
    }

    worker = spawn(process.execPath, [...execArgv, workerPath, projectPath, port], {
        // IPC channel enables process.send() from inside mcp-http-server.js
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
        windowsHide: true,
        env: {
            ...process.env,
            OMNYSYS_MCP_PORT: port,
            OMNYSYS_PROXY_MODE: '1',   // Tells mcp-http-server it's running under proxy
        }
    });

    log(`Worker PID: ${worker.pid}`);
    restartCount++;

    // ── IPC: handle restart signal from restart_server tool ───────────────────
    worker.on('message', (msg) => {
        if (msg?.type === 'restart') {
            if (restartScheduled) return;
            restartScheduled = true;

            log(`🔄 Restart requested (clearCache=${msg.clearCache}, reanalyze=${msg.reanalyze})`);

            // Give 300ms for the tool response to flush back to IDE before killing
            setTimeout(() => {
                log('⏹️  Sending SIGTERM to worker...');
                worker.kill('SIGTERM');
                // spawnWorker() is called from the 'close' event handler below
            }, 300);
        }
    });

    // ── Worker exit handler ───────────────────────────────────────────────────
    worker.on('close', (code, signal) => {
        log(`Worker exited (code=${code}, signal=${signal})`);

        if (restartScheduled) {
            restartScheduled = false;
            log('🚀 Respawning worker with fresh ESM cache...');
            // Small delay to allow OS to release port 9999 (Windows needs ~1s)
            setTimeout(spawnWorker, 1500);
        } else if (code !== 0) {
            log(`⚠️  Worker crashed (code=${code}). Respawning in 2s...`);
            setTimeout(spawnWorker, 2000);
        } else {
            log('Worker exited cleanly. Proxy shutting down.');
            process.exit(0);
        }
    });

    worker.on('error', (err) => {
        log(`Worker error: ${err.message}`);
    });
}

// ── Proxy shutdown ────────────────────────────────────────────────────────────
function shutdown() {
    log('Proxy SIGINT/SIGTERM — shutting down worker...');
    if (worker) {
        worker.kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 2000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ── Start ─────────────────────────────────────────────────────────────────────
log(`OmnySys MCP HTTP Proxy starting — project: ${projectPath}, port: ${port}`);
log(`Worker: ${workerPath}`);
spawnWorker();
