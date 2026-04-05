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
import {
    ensureCompilerRuntimeDirSync,
    readProxyRuntimeTelemetry,
    removeDaemonOwnerLockSync,
    writeDaemonOwnerLockSync,
    writeProxyRuntimeTelemetrySync
} from '../shared/compiler/index.js';
import { sanitizeLogText } from '../utils/logger.js';
import {
    detectHealthyDaemon,
    waitForPortRelease
} from './mcp-http-proxy-health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// ── Logging ─────────────────────────────────────────────────────────────────
const logsDir = path.join(projectRoot, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logFile = path.join(logsDir, 'mcp-http-proxy.log');
fs.writeFileSync(logFile, ''); // Fresh log each session

function log(msg) {
    const ts = new Date().toISOString().slice(11, 23);
    const line = sanitizeLogText(`[proxy] ${ts} ${msg}\n`);
    fs.appendFileSync(logFile, line);
    process.stdout.write(line); // Also show in IDE task terminal
}

// ── Config ───────────────────────────────────────────────────────────────────
const workerPath = path.join(__dirname, 'mcp-http-server.js');
const projectPath = process.argv[2] || process.cwd();
const port = process.argv[3] || process.env.OMNYSYS_MCP_PORT || '9999';
const bugModeEnabled = process.argv.includes('--bug-mode') || process.env.OMNYSYS_BUG_MODE === '1';

if (bugModeEnabled) {
    process.env.OMNYSYS_BUG_MODE = '1';
    log('Bug mode enabled: tool and guard traces are active');
}

let worker = null;
let restartScheduled = false;
let restartInFlight = false;
let restartCount = 0;
let respawnTimer = null;
let shutdownInProgress = false;
let proxyTelemetry = readProxyRuntimeTelemetry(projectRoot) || null;

function nowIso() {
    return new Date().toISOString();
}

function persistProxyTelemetry(patch = {}) {
    proxyTelemetry = {
        ...(proxyTelemetry || {}),
        projectPath,
        port: String(port),
        pid: process.pid,
        updatedAt: nowIso(),
        ...patch
    };

    try {
        writeProxyRuntimeTelemetrySync(projectRoot, proxyTelemetry);
    } catch (error) {
        log(`⚠️  Failed to persist proxy telemetry: ${error.message}`);
    }

    return proxyTelemetry;
}

function recordProxyEvent(type, details = {}) {
    const current = proxyTelemetry || { events: [] };
    const events = Array.isArray(current.events) ? current.events.slice(-19) : [];
    events.push({
        type,
        at: nowIso(),
        ...details
    });
    return persistProxyTelemetry({
        events,
        lastEventType: type,
        lastEventAt: events[events.length - 1]?.at || nowIso(),
        ...details
    });
}

function writeOwnerLock(state) {
    writeDaemonOwnerLockSync(projectRoot, {
        pid: process.pid,
        port,
        state,
        projectPath
    });
}

function removeOwnerLock() {
    removeDaemonOwnerLockSync(projectRoot, port);
}

function clearRespawnTimer() {
    if (respawnTimer) {
        clearTimeout(respawnTimer);
        respawnTimer = null;
    }
}

function scheduleRespawn(delayMs, extraArgs = []) {
    clearRespawnTimer();
    respawnTimer = setTimeout(() => {
        respawnTimer = null;
        waitForPortRelease(port, process.platform === 'win32' ? 12 : 6, process.platform === 'win32' ? 750 : 400)
            .then(async (released) => {
                if (!released && await detectHealthyDaemon()) {
                    log('✅ Healthy daemon detected while waiting for port release. Proxy will not respawn a duplicate worker.');
                    removeOwnerLock();
                    process.exit(0);
                    return;
                }
                spawnWorker(extraArgs);
            })
            .catch((error) => {
                log(`Port release wait failed: ${error.message}`);
                spawnWorker(extraArgs);
            });
    }, delayMs);
}

// ── Spawn Worker ─────────────────────────────────────────────────────────────
function shouldPreserveHistoryArtifact(fileName) {
    const name = String(fileName || '');
    return (
        name === 'health-history.db' ||
        name.startsWith('health-history.db-') ||
        name.startsWith('health-history.db.') ||
        name === 'atom-history.db' ||
        name.startsWith('atom-history.db-') ||
        name.startsWith('atom-history.db.')
    );
}

function spawnWorker(extraArgs = []) {
    clearRespawnTimer();
    writeOwnerLock(restartCount === 0 ? 'starting' : 'restarting');
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

    // Prepare worker arguments
    const workerArgs = [workerPath, projectPath, port, ...extraArgs];

    worker = spawn(process.execPath, [...execArgv, ...workerArgs], {
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
    const spawnCount = restartCount + 1;
    persistProxyTelemetry({
      state: 'starting',
      workerPid: worker.pid,
      workerStartedAt: nowIso(),
      workerExitAt: null,
      workerExitCode: null,
      workerExitSignal: null,
      restartCount: spawnCount,
      crashCount: proxyTelemetry?.crashCount || 0,
      unexpectedExitCount: proxyTelemetry?.unexpectedExitCount || 0,
      cleanExitCount: proxyTelemetry?.cleanExitCount || 0
    });
    restartCount = spawnCount;
    recordProxyEvent(restartCount === 1 ? 'spawn-initial' : 'spawn-restart', { workerPid: worker.pid, restartCount });

    // ── IPC: handle restart signal from restart_server tool ───────────────────
    worker.on('message', (msg) => {
        if (msg?.type === 'restart') {
            if (restartScheduled || restartInFlight) return;
            restartInFlight = true;
            restartScheduled = true;
            clearRespawnTimer();

            log(`🔄 Restart requested (clearCache=${msg.clearCache}, reanalyze=${msg.reanalyze})`);
            writeOwnerLock('restarting');
            recordProxyEvent('restart-requested', {
                clearCache: !!msg.clearCache,
                reanalyze: !!msg.reanalyze,
                reindexOnly: !!msg.reindexOnly,
                workerPid: worker?.pid || null,
                restartCount
            });

            // Capture flags to pass to the next spawn
            const nextArgs = [];
            if (msg.reanalyze) nextArgs.push('--reanalyze');
            if (msg.clearCache) nextArgs.push('--clearCache');
            if (msg.reindexOnly) nextArgs.push('--reindexOnly');

            // Give 300ms for the tool response to flush back to IDE before killing
            setTimeout(() => {
                log('⏹️  Sending SIGTERM to worker...');
                worker.kill('SIGTERM');
                restartScheduled = nextArgs; // Store args instead of just true
            }, 300);
        }
    });

    // ── Worker exit handler ───────────────────────────────────────────────────
    worker.on('close', async (code, signal) => {
        log(`Worker exited (code=${code}, signal=${signal})`);
        persistProxyTelemetry({
            workerExitAt: nowIso(),
            workerExitCode: code,
            workerExitSignal: signal
        });

        if (restartScheduled) {
            const nextArgs = Array.isArray(restartScheduled) ? restartScheduled : [];
            restartScheduled = false;

            // ── Cleanup for reanalyze ─────────────────────────────────────────────
            // On Windows, file locks often prevent the worker from deleting its own DB.
            // By doing it here, after the worker has closed, we ensure success.
            if (nextArgs.includes('--reanalyze')) {
                log('🗑️  reanalyze=true: Cleaning up old analysis data from Proxy...');
                const dataDir = path.join(projectPath, '.omnysysdata');
                try {
                    const toDelete = ['files', 'atoms', 'molecules', 'watcher'];
                    for (const dir of toDelete) {
                        const dirPath = path.join(dataDir, dir);
                        if (fs.existsSync(dirPath)) {
                            fs.rmSync(dirPath, { recursive: true, force: true });
                        }
                    }
                    const dbFiles = ['omnysys.db', 'omnysys.db-wal', 'omnysys.db-shm', 'index.json', 'atom-versions.json'];
                    for (const file of dbFiles) {
                        if (shouldPreserveHistoryArtifact(file)) continue;
                        const filePath = path.join(dataDir, file);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                    log('✅ Data cleanup complete (Proxy-side)');
                } catch (err) {
                    log(`⚠️  Cleanup failed: ${err.message}`);
                }
            }

            log('🚀 Respawning worker with fresh ESM cache...');
            recordProxyEvent('worker-exit-planned-restart', {
                workerPid: worker?.pid || null,
                workerExitCode: code,
                workerExitSignal: signal,
                restartCount
            });
            // Small delay to allow OS to release port 9999 (Windows needs ~2-3s sometimes)
            const delay = process.platform === 'win32' ? 3000 : 1000;
            scheduleRespawn(delay, nextArgs);
            restartInFlight = false;
        } else if (code !== 0) {
            persistProxyTelemetry({
                state: 'crashed',
                crashCount: (proxyTelemetry?.crashCount || 0) + 1,
                unexpectedExitCount: (proxyTelemetry?.unexpectedExitCount || 0) + 1
            });
            recordProxyEvent('worker-crash', {
                workerPid: worker?.pid || null,
                workerExitCode: code,
                workerExitSignal: signal,
                restartCount
            });
            if (await detectHealthyDaemon()) {
                log('✅ Another healthy OmnySys daemon already owns the port. Proxy exiting without respawn loop.');
                removeOwnerLock();
                process.exit(0);
            }
            writeOwnerLock('restarting');
            log(`⚠️  Worker crashed (code=${code}). Respawning in 5s...`);
            // Increased delay for crashes to avoid tight loops on port conflict
            scheduleRespawn(5000);
        } else {
            persistProxyTelemetry({
                state: 'clean-exit',
                cleanExitCount: (proxyTelemetry?.cleanExitCount || 0) + 1
            });
            recordProxyEvent('worker-exit-clean', {
                workerPid: worker?.pid || null,
                workerExitCode: code,
                workerExitSignal: signal,
                restartCount
            });
            log('Worker exited cleanly. Proxy shutting down.');
            removeOwnerLock();
            process.exit(0);
        }
    });

    worker.on('error', (err) => {
        log(`Worker error: ${err.message}`);
        restartInFlight = false;
    });
}

// ── Proxy shutdown ────────────────────────────────────────────────────────────
function beginProxyShutdown() {
    shutdownInProgress = true;
    log('Proxy SIGINT/SIGTERM — shutting down worker...');
    clearRespawnTimer();
    removeOwnerLock();
    recordProxyEvent('proxy-shutdown', { shutdownInProgress: true });
}

function finalizeProxyShutdown() {
    if (worker) {
        worker.kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 2000);
}

function shutdown() {
    if (shutdownInProgress) {
        return;
    }

    beginProxyShutdown();
    finalizeProxyShutdown();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ── Start ─────────────────────────────────────────────────────────────────────
log(`OmnySys MCP HTTP Proxy starting — project: ${projectPath}, port: ${port}`);
log(`Worker: ${workerPath}`);

if (await detectHealthyDaemon()) {
    log('✅ Existing healthy OmnySys daemon detected. Proxy will not spawn a duplicate worker.');
    process.exit(0);
}

ensureCompilerRuntimeDirSync(projectRoot);
writeOwnerLock('starting');
persistProxyTelemetry({
    state: 'booting'
});
spawnWorker();
