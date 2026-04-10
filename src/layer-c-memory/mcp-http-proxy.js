#!/usr/bin/env node

/**
 * OmnySys MCP HTTP Proxy - True Restart Manager
 * Wraps mcp-http-server.js as a child process (IPC). Kills and respawns worker
 * on restart_server calls — fresh ESM cache without dropping the port.
 *
 * Usage: node src/layer-c-memory/mcp-http-proxy.js [projectPath] [port]
 */

import { log } from '../shared/logger-system.js';
import path from 'path';
import fs from 'fs';
import { spawnWorkerProcess, createShutdownHandler } from './worker-spawner.js';
import { shouldPreserveHistoryArtifact, nowIso } from '#shared/utils/normalize-helpers.js';
import { fileURLToPath } from 'url';
import {
    ensureCompilerRuntimeDirSync,
    readProxyRuntimeTelemetry,
    readDaemonOwnerLock,
    removeDaemonOwnerLockSync,
    writeDaemonOwnerLockSync,
    writeProxyRuntimeTelemetrySync
} from '../shared/compiler/index.js';
import {
    detectHealthyDaemon,
    waitForPortRelease
} from './mcp-http-proxy-health.js';
import { cleanupZombieProcesses } from './mcp-http-proxy-zombies.js';
import { resolveInitialProxyAction } from './mcp-http-proxy-bootstrap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// ── Logging ─────────────────────────────────────────────────────────────────
const logsDir = path.join(projectRoot, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logFile = path.join(logsDir, 'mcp-http-proxy.log');
fs.writeFileSync(logFile, '');

// ── Config ───────────────────────────────────────────────────────────────────
const workerPath = path.join(__dirname, 'mcp-http-server.js');
const projectPath = process.argv[2] || process.cwd();
const portStr = process.argv[3] || process.env.OMNYSYS_MCP_PORT || '9999';
const portNum = Number(portStr);
const port = Number.isFinite(portNum) && portNum > 0 && portNum < 65536 ? portNum : 9999;

if (!Number.isFinite(portNum) || portNum < 0 || portNum >= 65536) {
    console.error(`Invalid port value in proxy: "${portStr}". Using default port 9999.`);
}

const bugModeEnabled = process.argv.includes('--bug-mode') || process.env.OMNYSYS_BUG_MODE === '1';
const START_LOCK_DIR = path.join(projectRoot, '.omnysysdata');
const START_LOCK_PATH = path.join(START_LOCK_DIR, `daemon-start-${port}.lock`);
const START_LOCK_STALE_MS = 30000;

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
let startupLockHandle = null;

// Restart cooldown to prevent loops after processRestart.
// When the worker respawns with fresh ESM cache, the file watcher may detect
// residual changes (new files from refactor, etc.). This cooldown prevents
// those from triggering another restart.
const RESTART_COOLDOWN_MS = 60000; // 60 seconds
let _lastRestartAt = 0;

function persistProxyTelemetry(patch = {}) {
    proxyTelemetry = { ...(proxyTelemetry || {}), projectPath, port: String(port), pid: process.pid, updatedAt: nowIso(), ...patch };
    try { writeProxyRuntimeTelemetrySync(projectRoot, proxyTelemetry); }
    catch (error) { log(`⚠️  Failed to persist proxy telemetry: ${error.message}`); }
    return proxyTelemetry;
}

function recordProxyEvent(type, details = {}) {
    const current = proxyTelemetry || { events: [] };
    const events = Array.isArray(current.events) ? current.events.slice(-19) : [];
    events.push({ type, at: nowIso(), ...details });
    return persistProxyTelemetry({ events, lastEventType: type, lastEventAt: events[events.length - 1]?.at || nowIso(), ...details });
}

function writeOwnerLock(state) {
    writeDaemonOwnerLockSync(projectRoot, { pid: process.pid, port, state, projectPath });
}

function removeOwnerLock() {
    removeDaemonOwnerLockSync(projectRoot, port);
}

function releaseStartupLock() {
    if (!startupLockHandle) {
        return;
    }

    try {
        fs.closeSync(startupLockHandle);
    } catch {
        // ignore close errors
    }
    startupLockHandle = null;

    try {
        fs.unlinkSync(START_LOCK_PATH);
    } catch {
        // ignore unlink errors
    }
}

function acquireStartupLock() {
    try {
        fs.mkdirSync(START_LOCK_DIR, { recursive: true });
        startupLockHandle = fs.openSync(START_LOCK_PATH, 'wx');
        fs.writeFileSync(START_LOCK_PATH, JSON.stringify({
            pid: process.pid,
            port,
            projectPath,
            createdAt: nowIso()
        }, null, 2));
        return true;
    } catch (error) {
        if (error?.code !== 'EEXIST') {
            log(`Warning: unable to acquire daemon start lock: ${error.message}`);
            return false;
        }

        try {
            const stats = fs.statSync(START_LOCK_PATH);
            if (Date.now() - stats.mtimeMs > START_LOCK_STALE_MS) {
                fs.unlinkSync(START_LOCK_PATH);
                return acquireStartupLock();
            }
        } catch {
            return false;
        }

        return false;
    }
}

async function waitForStartupLockRelease(timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const daemonHealth = await detectHealthyDaemon(port, projectPath);
        if (daemonHealth.alive) {
            return true;
        }

        if (!fs.existsSync(START_LOCK_PATH)) {
            return false;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return false;
}

function clearRespawnTimer() {
    if (respawnTimer) { clearTimeout(respawnTimer); respawnTimer = null; }
}

function scheduleRespawn(delayMs, extraArgs = []) {
    clearRespawnTimer();
    respawnTimer = setTimeout(() => {
        respawnTimer = null;
        waitForPortRelease(port, process.platform === 'win32' ? 12 : 6, process.platform === 'win32' ? 750 : 400)
            .then(async (released) => {
                const daemonHealth = !released ? await detectHealthyDaemon(port, projectPath) : null;
                if (!released && daemonHealth?.alive) {
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

function attachWorkerIPCListeners(worker) {
    worker.on('message', (msg) => {
        if (msg?.type === 'restart') {
            // CRITICAL: Cooldown check MUST be first and MUST return early.
            // Prevents restart loops when file watcher detects residual changes
            // after processRestart (fresh ESM cache worker spawn).
            const now = Date.now();
            const timeSinceLastRestart = now - _lastRestartAt;
            if (_lastRestartAt > 0 && timeSinceLastRestart < RESTART_COOLDOWN_MS) {
                const remaining = Math.round((RESTART_COOLDOWN_MS - timeSinceLastRestart) / 1000);
                const cooldownMsg = `⏳ RESTART BLOCKED by cooldown (${remaining}s remaining). File: ${msg.file || 'unknown'}. Reason: ${msg.reason || 'unknown'}`;
                log(cooldownMsg);
                recordProxyEvent('restart-suppressed-cooldown', {
                    remainingSeconds: remaining,
                    file: msg.file || null,
                    reason: msg.reason || null,
                    timeSinceLastRestart
                });
                
                // CRITICAL: Forward cooldown warning to daemon so it appears in recent errors
                // This allows AI agents to see and report these warnings
                if (worker && worker.connected) {
                    try {
                        worker.send({
                            type: 'cooldown-warning',
                            message: cooldownMsg,
                            file: msg.file || 'unknown',
                            reason: msg.reason || 'unknown',
                            remainingSeconds: remaining
                        });
                    } catch (err) {
                        // Ignore if worker can't receive
                    }
                }
                
                // CRITICAL: This return MUST exit the message handler entirely.
                // The cooldown is the gatekeeper — nothing below executes.
                return;
            }

            // Guard: prevent concurrent restart requests
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

            const nextArgs = [];
            if (msg.reanalyze) nextArgs.push('--reanalyze');
            if (msg.clearCache) nextArgs.push('--clearCache');
            if (msg.reindexOnly) nextArgs.push('--reindexOnly');
            if (msg.processRestart) nextArgs.push('--processRestart');

            setTimeout(() => {
                log(`⏹️  Sending SIGTERM to worker... (processRestart=${msg.processRestart})`);
                // Record restart time for cooldown — must be set BEFORE kill
                // so subsequent requests within 60s are suppressed
                _lastRestartAt = Date.now();
                worker.kill('SIGTERM');
                restartScheduled = nextArgs;
            }, 300);
        }
    });

    worker.on('close', async (code, signal) => {
        await handleWorkerClose(code, signal);
    });

    worker.on('error', (err) => {
        log(`Worker error: ${err.message}`);
        restartInFlight = false;
    });
}

async function handlePlannedRestart(code, signal, nextArgs) {
    if (nextArgs.includes('--reanalyze')) await cleanupAnalysisData();
    else if (nextArgs.includes('--processRestart')) {
        log('♻️  processRestart=true: Respawning worker — ALL databases preserved (omnysys.db, atom-history.db, health-history.db)');
    }
    log('🚀 Respawning worker with fresh ESM cache...');
    recordProxyEvent('worker-exit-planned-restart', { workerPid: worker?.pid || null, workerExitCode: code, workerExitSignal: signal, restartCount });
    scheduleRespawn(process.platform === 'win32' ? 3000 : 1000, nextArgs);
    restartInFlight = false;
}

async function handleWorkerCrash(code, signal) {
    log(`⚠️  WORKER CRASH HANDLER TRIGGERED - code: ${code}, signal: ${signal}`);
    persistProxyTelemetry({ state: 'crashed', crashCount: (proxyTelemetry?.crashCount || 0) + 1, unexpectedExitCount: (proxyTelemetry?.unexpectedExitCount || 0) + 1 });
    recordProxyEvent('worker-crash', { workerPid: worker?.pid || null, workerExitCode: code, workerExitSignal: signal, restartCount });
    
    try {
        const daemonCheck = await detectHealthyDaemon(port, projectPath);
        log(`Daemon health check after crash: ${JSON.stringify(daemonCheck)}`);
        
        if (daemonCheck.alive) {
            log('✅ Another healthy OmnySys daemon already owns the port. Proxy exiting without respawn loop.');
            removeOwnerLock();
            process.exit(0);
        }
    } catch (error) {
        log(`⚠️  Error checking daemon health: ${error.message}. Will respawn anyway.`);
    }
    
    writeOwnerLock('restarting');
    log(`⚠️  Worker crashed (code=${code}). Respawning in 5s...`);
    scheduleRespawn(5000);
}

async function handleWorkerClose(code, signal) {
    log(`Worker exited (code=${code}, signal=${signal})`);
    persistProxyTelemetry({ workerExitAt: nowIso(), workerExitCode: code, workerExitSignal: signal });

    // If this is a monitoring proxy (no worker ever spawned), check if daemon is still healthy
    if (restartCount === 0) {
        const daemonHealth = await detectHealthyDaemon(port, projectPath);
        if (daemonHealth.alive) {
            log('✅ Daemon is healthy. Proxy staying running as watchdog.');
            writeOwnerLock('monitoring');
            return; // Don't exit, stay monitoring
        }
        log('⚠️  Daemon is not healthy. Spawning new worker...');
        // Fall through to spawn logic below
    }

    if (restartScheduled) {
        const nextArgs = Array.isArray(restartScheduled) ? restartScheduled : [];
        restartScheduled = false;
        await handlePlannedRestart(code, signal, nextArgs);
    } else if (code !== 0) {
        await handleWorkerCrash(code, signal);
    } else {
        handleCleanExit(code, signal);
    }
}

async function cleanupAnalysisData() {
    log('🗑️  reanalyze=true: Cleaning up old analysis data from Proxy...');
    const dataDir = path.join(projectPath, '.omnysysdata');
    try {
        for (const dir of ['files', 'atoms', 'molecules', 'watcher']) {
            const dirPath = path.join(dataDir, dir);
            if (fs.existsSync(dirPath)) {
                fs.rmSync(dirPath, { recursive: true, force: true });
            }
        }
        for (const file of ['omnysys.db', 'omnysys.db-wal', 'omnysys.db-shm', 'index.json', 'atom-versions.json']) {
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

function spawnWorker(extraArgs = []) {
    clearRespawnTimer();
    writeOwnerLock(restartCount === 0 ? 'starting' : 'restarting');
    log(`Spawning mcp-http-server.js (restart #${restartCount})...`);

    // spawnWorkerProcess already adds workerPath, so only pass projectPath and port
    const workerArgs = [projectPath, String(port), ...extraArgs];
    worker = spawnWorkerProcess(workerPath, workerArgs, { proxyModeEnv: '1' });

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

    attachWorkerIPCListeners(worker);
}

// ── Proxy shutdown ────────────────────────────────────────────────────────────
const shutdown = createShutdownHandler(worker, 'Proxy', () => {
    shutdownInProgress = true;
    clearRespawnTimer();
    removeOwnerLock();
    releaseStartupLock();
    recordProxyEvent('proxy-shutdown', { shutdownInProgress: true });
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// CRITICAL: Prevent unhandled rejection crashes
process.on('unhandledRejection', (reason, promise) => {
    log(`⚠️  UNHANDLED REJECTION (non-fatal): ${reason}`);
    // Don't exit - just log it
});

process.on('uncaughtException', (error) => {
    log(`⚠️  UNCAUGHT EXCEPTION: ${error.message}`);
    // Don't exit - let the proxy stay alive
});

// ── Start ─────────────────────────────────────────────────────────────────────
log(`OmnySys MCP HTTP Proxy starting — project: ${projectPath}, port: ${port}`);
log(`Worker: ${workerPath}`);

if (!acquireStartupLock()) {
    log('Another proxy startup is already in progress. Waiting for it to become healthy...');
    const startLockResolved = await waitForStartupLockRelease();
    if (startLockResolved) {
        log('Existing daemon became healthy while waiting for start lock. Exiting duplicate proxy.');
        process.exit(0);
    }

    if (!acquireStartupLock()) {
        log('Could not obtain daemon start lock. Exiting to avoid duplicate startup.');
        process.exit(0);
    }
}

// CLEANUP: Detect and kill zombie processes from previous restarts before spawning.
await cleanupZombieProcesses(process.pid, log);

const existingDaemon = await detectHealthyDaemon(port, projectPath);
let shouldSpawnInitialWorker = true;
if (existingDaemon.alive) {
    log(`✅ Existing healthy OmnySys daemon detected (PID ${existingDaemon.processInfo?.pid}). Proxy will monitor it.`);
    log('⚠️  Proxy will stay running as backup in case the daemon dies.');

    const ownerLock = await readDaemonOwnerLock(projectRoot, port);
    const initialAction = resolveInitialProxyAction({
        existingDaemonAlive: true,
        ownerPid: ownerLock?.pid || null,
        currentPid: process.pid
    });

    if (initialAction.action === 'exit') {
        log(`ℹ️  Another proxy (PID ${ownerLock.pid}) is managing this daemon. This proxy will exit.`);
        releaseStartupLock();
        process.exit(0);
    }

    if (initialAction.action === 'monitor') {
        log('👀 No proxy owns this daemon - staying as watchdog manager.');
        writeOwnerLock('monitoring');
        persistProxyTelemetry({
            state: 'monitoring',
            workerPid: existingDaemon.processInfo?.pid || null,
            workerStartedAt: null,
            workerExitAt: null,
            workerExitCode: null,
            workerExitSignal: null
        });
        recordProxyEvent('proxy-monitoring-existing-daemon', {
            workerPid: existingDaemon.processInfo?.pid || null,
            restartCount
        });
        startDaemonWatchdogHealthCheck();
        shouldSpawnInitialWorker = false;
        releaseStartupLock();
    }
}

/**
 * Periodically checks daemon health and respawns if needed.
 * Runs every 10 seconds to detect daemon failures.
 * Includes circuit breaker to prevent restart loops.
 */
function startDaemonWatchdogHealthCheck() {
    const HEALTH_CHECK_INTERVAL_MS = 10000; // 10 seconds
    const MAX_RESPONSE_TIME_MS = 3000; // 3 seconds timeout
    const CONSECUTIVE_FAILURES_THRESHOLD = 3; // Require 3 consecutive failures before respawn
    
    let respawnAttempted = false;
    let consecutiveFailures = 0;
    let lastSuccessfulCheck = Date.now();
    
    setInterval(async () => {
        if (shutdownInProgress || respawnAttempted) return;
        
        try {
            const daemonHealth = await detectHealthyDaemon(port, projectPath, MAX_RESPONSE_TIME_MS);
            
            if (daemonHealth.alive) {
                // Reset failure counter on success
                if (consecutiveFailures > 0) {
                    log(`✅ Health check recovered (was ${consecutiveFailures} failures)`);
                }
                consecutiveFailures = 0;
                lastSuccessfulCheck = Date.now();
                
                // Log slow responses as warnings (but don't respawn yet)
                if (daemonHealth.responseTimeMs > 1000) {
                    log(`⚠️  Daemon responding slowly: ${daemonHealth.responseTimeMs}ms`);
                }
                return;
            }
            
            // Daemon is unhealthy or frozen
            consecutiveFailures++;
            const failureType = daemonHealth.isFrozen ? 'FROZEN' : daemonHealth.isTimeout ? 'TIMEOUT' : 'UNHEALTHY';
            const detail = daemonHealth.message || `responseTime: ${daemonHealth.responseTimeMs}ms`;
            
            log(`⚠️  Watchdog health check #${consecutiveFailures} failed (${failureType}): ${detail}`);
            
            // Circuit breaker: only respawn after N consecutive failures
            if (consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD) {
                log(`🚨 CIRCUIT BREAKER: ${consecutiveFailures} consecutive failures. Respawning worker...`);
                recordProxyEvent('watchdog-circuit-breaker-triggered', {
                    failureType,
                    consecutiveFailures,
                    lastResponseTime: daemonHealth.responseTimeMs
                });
                respawnAttempted = true;
                
                // Clear restart cooldown for watchdog-initiated respawns
                _lastRestartAt = 0;
                scheduleRespawn(2000);
            }
        } catch (error) {
            log(`⚠️  Watchdog health check error: ${error.message}`);
            consecutiveFailures++;
            
            if (consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD) {
                log(`🚨 CIRCUIT BREAKER: Health check errors. Respawning worker...`);
                recordProxyEvent('watchdog-health-check-error');
                respawnAttempted = true;
                _lastRestartAt = 0;
                scheduleRespawn(2000);
            }
        }
    }, HEALTH_CHECK_INTERVAL_MS).unref();
    
    // Log initial state
    log(`👀 Watchdog health check started (interval: ${HEALTH_CHECK_INTERVAL_MS / 1000}s, timeout: ${MAX_RESPONSE_TIME_MS}ms, threshold: ${CONSECUTIVE_FAILURES_THRESHOLD} failures)`);
}

ensureCompilerRuntimeDirSync(projectRoot);

// Poll for restart signal file (fallback for broken IPC channel)
const RESTART_SIGNAL_FILE = path.join(projectPath, '.omnysysdata', 'restart-signal.json');
const signalCheckInterval = setInterval(() => {
    try {
        if (fs.existsSync(RESTART_SIGNAL_FILE)) {
            const content = fs.readFileSync(RESTART_SIGNAL_FILE, 'utf8');
            const signal = JSON.parse(content);
            const now = Date.now();
            // Only process signals from the last 10 seconds (prevent stale signals)
            const signalTime = new Date(signal.timestamp).getTime();
            if (now - signalTime < 10000 && !restartInFlight && !restartScheduled) {
                log(`🔄 Restart signal file detected (${signal.type}). Triggering restart...`);
                fs.unlinkSync(RESTART_SIGNAL_FILE);
                restartInFlight = true;
                restartScheduled = signal.type === 'processRestart' ? ['--processRestart'] : [];
                _lastRestartAt = Date.now();
                if (worker && worker.connected) {
                    worker.kill('SIGTERM');
                }
            }
        }
    } catch {
        // Ignore parse errors or race conditions
    }
}, 500).unref();

if (shouldSpawnInitialWorker) {
    writeOwnerLock('starting');
    persistProxyTelemetry({ state: 'booting' });
    spawnWorker();
    releaseStartupLock();
}
