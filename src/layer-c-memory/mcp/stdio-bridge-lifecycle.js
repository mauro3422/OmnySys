#!/usr/bin/env node
/**
 * Lifecycle helpers for the MCP stdio bridge.
 *
 * Keeps daemon startup/recovery logic isolated from transport wiring so the
 * bridge can remain focused on request forwarding.
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    readDaemonOwnerLock,
    waitForDaemonOwner
} from '../../shared/compiler/index.js';

const DAEMON_URL = new URL(process.env.OMNYSYS_DAEMON_URL || 'http://127.0.0.1:9999/mcp');
const DAEMON_HEALTH = process.env.OMNYSYS_HEALTH_URL || 'http://127.0.0.1:9999/health';
const AUTO_START = process.env.OMNYSYS_AUTO_START !== '0';
const PROJECT_PATH = path.resolve(process.env.OMNYSYS_PROJECT_PATH || process.cwd());
const DAEMON_PORT = String(DAEMON_URL.port || '9999');
const START_LOCK_DIR = path.join(PROJECT_PATH, '.omnysysdata');
const START_LOCK_PATH = path.join(START_LOCK_DIR, `daemon-start-${DAEMON_PORT}.lock`);
const START_LOCK_STALE_MS = 30000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message) {
    process.stderr.write(`[mcp-stdio-bridge] ${new Date().toISOString().slice(11, 23)} ${message}\n`);
}

async function checkDaemon() {
    const { default: http } = await import('http');
    return new Promise((resolve) => {
        const req = http.get(DAEMON_HEALTH, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(
                        json.service === 'omnysys-mcp' ||
                        json.service === 'omnysys-mcp-http' ||
                        typeof json.status !== 'undefined'
                    );
                } catch {
                    resolve(false);
                }
            });
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function resolveDaemonEntry() {
    const candidates = [
        path.join(PROJECT_PATH, 'src', 'layer-c-memory', 'mcp-http-proxy.js'),
        path.join(PROJECT_PATH, 'mcp-http-proxy.js'),
        path.join(__dirname, 'mcp-http-proxy.js'),
        path.join(__dirname, '..', '..', 'mcp-http-server.js'),
        path.join(__dirname, 'mcp-http-server.js'),
        path.join(PROJECT_PATH, 'mcp-http-server.js'),
        path.join(PROJECT_PATH, 'src', 'layer-c-memory', 'mcp-http-server.js')
    ];

    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            // try next candidate
        }
    }

    return null;
}

async function ensureStartLockDir() {
    await fs.mkdir(START_LOCK_DIR, { recursive: true });
}

async function releaseStartLock(handle) {
    if (!handle) return;

    try {
        await handle.close();
    } catch {
        // ignore close errors
    }

    try {
        await fs.unlink(START_LOCK_PATH);
    } catch {
        // ignore unlink errors
    }
}

async function waitForExistingOwner(timeoutMs = 20000) {
    const ownerLock = await readDaemonOwnerLock(PROJECT_PATH, DAEMON_PORT);
    if (!ownerLock) {
        return false;
    }
    return await waitForDaemonOwner(PROJECT_PATH, {
        port: DAEMON_PORT,
        checkDaemon,
        timeoutMs,
        log
    });
}

async function acquireStartLock() {
    await ensureStartLockDir();

    try {
        const handle = await fs.open(START_LOCK_PATH, 'wx');
        await handle.writeFile(JSON.stringify({
            pid: process.pid,
            port: DAEMON_PORT,
            projectPath: PROJECT_PATH,
            createdAt: new Date().toISOString()
        }));
        return handle;
    } catch (error) {
        if (error?.code !== 'EEXIST') {
            throw error;
        }

        try {
            const stats = await fs.stat(START_LOCK_PATH);
            const ageMs = Date.now() - stats.mtimeMs;
            if (ageMs > START_LOCK_STALE_MS) {
                await fs.unlink(START_LOCK_PATH);
                return await acquireStartLock();
            }
        } catch {
            return await acquireStartLock();
        }

        return null;
    }
}

export async function waitForDaemonReady() {
    let ready = await checkDaemon();
    if (!ready && AUTO_START) {
        ready = await startDaemon();
    }

    if (!ready) {
        log('Waiting for daemon to initialize...');
        for (let i = 0; i < 10; i++) {
            ready = await checkDaemon();
            if (ready) break;
            log(`Waiting (${i + 1}/10)...`);
            await waitMs(1000);
        }
    }

    if (!ready) {
        log('ERROR: Daemon not reachable');
        log(`Health URL: ${DAEMON_HEALTH}`);
        log(`Manual start: node src/layer-c-memory/mcp-http-proxy.js ${PROJECT_PATH} ${DAEMON_PORT}`);
        process.exit(1);
    }
}

export async function startDaemon() {
    log(`Daemon not running, attempting auto-start for ${PROJECT_PATH}...`);

    if (await checkDaemon()) {
        log('Daemon became healthy before auto-start. Skipping spawn.');
        return true;
    }

    if (await waitForExistingOwner()) {
        return true;
    }

    const startLock = await acquireStartLock();
    if (!startLock) {
        log('Another bridge is already auto-starting the daemon. Waiting for readiness...');
        for (let i = 0; i < 20; i++) {
            await waitMs(500);
            if (await checkDaemon()) {
                log('Daemon became healthy while waiting on start lock.');
                return true;
            }
        }
        log('ERROR: Timed out waiting for another bridge to start the daemon.');
        return false;
    }

    try {
        if (await checkDaemon()) {
            log('Daemon became healthy after acquiring start lock. Skipping spawn.');
            return true;
        }

        if (await waitForExistingOwner()) {
            return true;
        }

        const daemonEntry = await resolveDaemonEntry();
        if (!daemonEntry) {
            log('ERROR: Cannot find mcp-http-server.js');
            return false;
        }

        log(`Starting daemon entry: ${daemonEntry}`);

        const daemonProcess = spawn(process.execPath, [
            '--max-old-space-size=8192',
            daemonEntry,
            PROJECT_PATH,
            DAEMON_PORT
        ], {
            cwd: PROJECT_PATH,
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
            env: {
                ...process.env,
                OMNYSYS_MCP_PORT: DAEMON_PORT
            }
        });

        daemonProcess.unref();

        for (let i = 0; i < 20; i++) {
            await waitMs(500);
            const ready = await checkDaemon();
            if (ready) {
                log('Daemon started successfully');
                return true;
            }
        }

        log('ERROR: Daemon failed to start within 10 seconds');
        return false;
    } finally {
        await releaseStartLock(startLock);
    }
}

export function createBridgeState(stdioTransport) {
    return {
        stdioTransport,
        httpTransport: null,
        isReconnecting: false,
        reconnectPromise: null,
        lastSessionId: null,
        pendingRequests: new Map(),
        internalRequests: new Map(),
        cachedInitializeRequest: null,
        cachedInitializedNotification: null
    };
}

export async function sendBridgeRetryableError(state, id, message, data = {}) {
    if (typeof id === 'undefined') return;

    try {
        await state.stdioTransport.send({
            jsonrpc: '2.0',
            id,
            error: {
                code: -32098,
                message,
                data: {
                    retryable: true,
                    daemonUrl: DAEMON_URL.href,
                    sessionId: state.lastSessionId,
                    ...data
                }
            }
        });
    } catch (err) {
        log(`Failed to send retryable error for request ${id}: ${err.message}`);
    }
}

export async function failBridgePendingRequests(state, reason) {
    const requests = Array.from(state.pendingRequests.values());
    state.pendingRequests.clear();

    for (const request of requests) {
        await sendBridgeRetryableError(
            state,
            request.id,
            reason,
            { interruptedMethod: request.method || 'unknown' }
        );
    }
}

export async function sendBridgeInternalRequest(state, message, timeoutMs = 10000) {
    return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            state.internalRequests.delete(message.id);
            reject(new Error(`Internal MCP request timed out: ${message.method}`));
        }, timeoutMs);

        state.internalRequests.set(message.id, {
            resolve,
            reject,
            timeout
        });

        state.httpTransport.send(message)
            .then(() => {
                if (state.httpTransport?._sessionId) {
                    state.lastSessionId = state.httpTransport._sessionId;
                }
            })
            .catch((error) => {
                clearTimeout(timeout);
                state.internalRequests.delete(message.id);
                reject(error);
            });
    });
}

export async function replayBridgeSession(state) {
    if (!state.cachedInitializeRequest?.params) {
        log('No cached initialize request available. Bridge cannot auto-reinitialize this client session.');
        return;
    }

    const internalId = `bridge-reinit-${Date.now()}`;
    const initMessage = {
        ...state.cachedInitializeRequest,
        id: internalId
    };

    log('Replaying cached initialize request to rebuild MCP session...');
    await sendBridgeInternalRequest(state, initMessage, 15000);

    if (state.cachedInitializedNotification) {
        try {
            await state.httpTransport.send(state.cachedInitializedNotification);
        } catch (error) {
            log(`Failed to replay initialized notification: ${error.message}`);
        }
    }
}

export async function startBridgeRecovery(state, trigger, connectBridgeTransport) {
    if (state.isReconnecting) {
        return state.reconnectPromise;
    }

    state.isReconnecting = true;
    await failBridgePendingRequests(
        state,
        'DAEMON_RESTARTING: in-flight request was interrupted. Retry after bridge recovery.'
    );

    state.reconnectPromise = (async () => {
        log(`Starting bridge recovery (${trigger})...`);

        let recovered = false;
        for (let i = 0; i < 15; i++) {
            recovered = await checkDaemon();
            if (recovered) break;
            log(`Waiting for daemon to restart (${i + 1}/15)...`);
            await waitMs(1000);
        }

        if (!recovered) {
            log('Daemon recovery failed. Shutting down bridge.');
            state.stdioTransport.close().catch(() => {});
            process.exit(1);
        }

        log('Daemon recovered. Reconnecting HTTP transport...');
        try {
            const previousSessionId = state.lastSessionId;
            await connectBridgeTransport(state, { sessionId: previousSessionId });
            try {
                await replayBridgeSession(state);
                log(`Bridge reconnected successfully${state.lastSessionId ? ` (session ${state.lastSessionId})` : ''}.`);
            } catch (error) {
                log(`Session replay failed with previous session ${previousSessionId || 'n/a'}: ${error.message}`);
                state.lastSessionId = null;
                await connectBridgeTransport(state, { sessionId: null });
                await replayBridgeSession(state);
                log(`Bridge reconnected successfully${state.lastSessionId ? ` (session ${state.lastSessionId})` : ''}.`);
            }
        } catch (error) {
            log(`Reconnection failed: ${error.message}`);
            process.exit(1);
        }
    })();

    try {
        await state.reconnectPromise;
    } finally {
        state.isReconnecting = false;
        state.reconnectPromise = null;
    }
}
