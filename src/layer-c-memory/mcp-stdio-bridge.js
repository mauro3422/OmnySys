#!/usr/bin/env node
/**
 * OmnySys MCP Stdio Bridge
 *
 * Bridges stdio transport (IDE side) <-> Streamable HTTP (OmnySys daemon).
 * It can also auto-start the daemon when the HTTP endpoint is not available.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    readDaemonOwnerLock,
    waitForDaemonOwner
} from '../shared/compiler/index.js';

const DAEMON_URL = new URL(process.env.OMNYSYS_DAEMON_URL || 'http://127.0.0.1:9999/mcp');
const DAEMON_HEALTH = process.env.OMNYSYS_HEALTH_URL || 'http://127.0.0.1:9999/health';
const AUTO_START = process.env.OMNYSYS_AUTO_START !== '0';
const PROJECT_PATH = path.resolve(process.env.OMNYSYS_PROJECT_PATH || process.cwd());
const DAEMON_PORT = String(DAEMON_URL.port || '9999');
const START_LOCK_DIR = path.join(PROJECT_PATH, '.omnysysdata');
const START_LOCK_PATH = path.join(START_LOCK_DIR, `daemon-start-${DAEMON_PORT}.lock`);
const START_LOCK_STALE_MS = 30000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function log(message) {
    process.stderr.write(`[mcp-stdio-bridge] ${new Date().toISOString().slice(11, 23)} ${message}\n`);
}

function isRequestMessage(message) {
    return !!message &&
        typeof message === 'object' &&
        typeof message.method === 'string' &&
        Object.prototype.hasOwnProperty.call(message, 'id');
}

function isResponseMessage(message) {
    return !!message &&
        typeof message === 'object' &&
        !Object.prototype.hasOwnProperty.call(message, 'method') &&
        Object.prototype.hasOwnProperty.call(message, 'id');
}

function shouldTriggerRecovery(error) {
    const message = String(error?.message || error || '');
    return /Server not initialized|SESSION_EXPIRED|session expired|Invalid session|session not found/i.test(message);
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

async function startDaemon() {
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
            await new Promise((resolve) => setTimeout(resolve, 500));
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
            await new Promise((resolve) => setTimeout(resolve, 500));
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

function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDaemonReady() {
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

function createBridgeState(stdioTransport) {
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

async function sendBridgeRetryableError(state, id, message, data = {}) {
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

async function failBridgePendingRequests(state, reason) {
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

async function sendBridgeInternalRequest(state, message, timeoutMs = 10000) {
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

async function replayBridgeSession(state) {
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

async function startBridgeRecovery(state, trigger) {
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
            state.lastSessionId = null;
            await connectBridgeTransport(state);
            await replayBridgeSession(state);
            log(`Bridge reconnected successfully${state.lastSessionId ? ` (session ${state.lastSessionId})` : ''}.`);
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

async function connectBridgeTransport(state) {
    state.httpTransport = new StreamableHTTPClientTransport(
        DAEMON_URL,
        state.lastSessionId ? { sessionId: state.lastSessionId } : undefined
    );

    state.httpTransport.onmessage = async (message) => {
        try {
            if (isResponseMessage(message) && state.internalRequests.has(message.id)) {
                const pending = state.internalRequests.get(message.id);
                state.internalRequests.delete(message.id);
                clearTimeout(pending.timeout);

                if (message.error) {
                    pending.reject(new Error(message.error.message || 'Internal MCP request failed'));
                } else {
                    pending.resolve(message);
                }
                return;
            }

            if (isResponseMessage(message)) {
                state.pendingRequests.delete(message.id);
            }
            await state.stdioTransport.send(message);
        } catch (err) {
            log(`Error forwarding daemon->IDE: ${err.message}`);
        }
    };

    state.httpTransport.onerror = (err) => log(`http error: ${err.message}`);
    state.httpTransport.onclose = async () => {
        log('Daemon disconnected.');
        await startBridgeRecovery(state, 'transport closed');
    };

    await state.httpTransport.start();
}

async function handleBridgeStdioMessage(state, message) {
    if (state.isReconnecting) {
        if (isRequestMessage(message)) {
            log(`Rejecting request ${message.method} while daemon is restarting.`);
            await sendBridgeRetryableError(
                state,
                message.id,
                'DAEMON_RESTARTING: bridge is recovering. Retry this request in a moment.',
                { interruptedMethod: message.method }
            );
            return;
        }

        log('Dropping notification while daemon is restarting.');
        return;
    }

    try {
        if (message?.method === 'initialize' && isRequestMessage(message)) {
            state.cachedInitializeRequest = message;
        } else if (
            message?.method === 'notifications/initialized' &&
            !Object.prototype.hasOwnProperty.call(message, 'id')
        ) {
            state.cachedInitializedNotification = message;
        }

        if (isRequestMessage(message)) {
            state.pendingRequests.set(message.id, message);
        }

        await state.httpTransport.send(message);
        if (state.httpTransport?._sessionId) {
            state.lastSessionId = state.httpTransport._sessionId;
        }
    } catch (err) {
        if (shouldTriggerRecovery(err)) {
            void startBridgeRecovery(state, 'server rejected request after daemon restart');
        }

        if (isRequestMessage(message)) {
            state.pendingRequests.delete(message.id);
            await sendBridgeRetryableError(
                state,
                message.id,
                `BRIDGE_FORWARD_FAILED: ${err.message}`,
                { interruptedMethod: message.method }
            );
            return;
        }

        log(`Error forwarding IDE->daemon: ${err.message}`);
    }
}

function handleBridgeStdioClose(state) {
    log('IDE disconnected - shutting down bridge.');
    if (state.httpTransport && !state.isReconnecting) {
        state.httpTransport.close().catch(() => {});
    }
    process.exit(0);
}

async function main() {
    log(`Starting bridge for ${PROJECT_PATH} - checking daemon...`);
    await waitForDaemonReady();

    log(`Daemon ready. Bridging stdio <-> ${DAEMON_URL}`);

    const stdioTransport = new StdioServerTransport();
    const state = createBridgeState(stdioTransport);

    await connectBridgeTransport(state);

    stdioTransport.onmessage = async (message) => {
        await handleBridgeStdioMessage(state, message);
    };

    stdioTransport.onerror = (err) => log(`stdio error: ${err.message}`);
    stdioTransport.onclose = () => {
        handleBridgeStdioClose(state);
    };

    await stdioTransport.start();
    log('Bridge active.');
}

main().catch((err) => {
    process.stderr.write(`[mcp-stdio-bridge] FATAL: ${err.message}\n`);
    process.exit(1);
});


