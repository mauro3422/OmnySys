#!/usr/bin/env node
/**
 * OmnySys MCP Stdio Bridge
 *
 * Bridges stdio transport (IDE side) <-> Streamable HTTP (OmnySys daemon).
 * Daemon lifecycle and session recovery live in stdio-bridge-lifecycle.js.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createCliOrchestrator } from '../shared/cli/base-orchestrator.js';
import { nowIso } from '#shared/utils/normalize-helpers.js';
import {
    createBridgeState,
    log,
    waitForDaemonReady,
    sendBridgeRetryableError
} from './mcp/stdio-bridge-lifecycle.js';
import {
    startBridgeRecovery,
    scheduleBridgeRecovery
} from './mcp/stdio-bridge-recovery.js';
import {
    getDaemonUrl,
    isRequestMessage,
    isResponseMessage,
    isSessionExpiredError,
    normalizeBridgeInitializeMessage,
    shouldTriggerRecovery,
    waitForBridgeSessionId
} from './mcp/stdio-bridge-helpers.js';
import {
    readBridgeRuntimeTelemetry,
    writeBridgeRuntimeTelemetrySync
} from '../shared/compiler/index.js';

const DAEMON_URL = getDaemonUrl();
const PROJECT_PATH = process.env.OMNYSYS_PROJECT_PATH || process.cwd();

let bridgeTelemetry = readBridgeRuntimeTelemetry(PROJECT_PATH) || null;

function persistBridgeTelemetry(patch = {}) {
    bridgeTelemetry = {
        ...(bridgeTelemetry || {}),
        projectPath: PROJECT_PATH,
        updatedAt: nowIso(),
        ...patch
    };

    try {
        writeBridgeRuntimeTelemetrySync(PROJECT_PATH, bridgeTelemetry);
    } catch (error) {
        log(`bridge telemetry persist failed: ${error.message}`);
    }

    return bridgeTelemetry;
}

function recordBridgeEvent(type, details = {}) {
    const current = bridgeTelemetry || { events: [] };
    const events = Array.isArray(current.events) ? current.events.slice(-29) : [];
    events.push({
      type,
      at: nowIso(),
      ...details
    });

    const connectCount = (current.connectCount || 0) + (type === 'bridge-connect' ? 1 : 0);
    const reconnectCount = (current.reconnectCount || 0) + (type === 'bridge-reconnect' ? 1 : 0);
    const transportClosedCount = (current.transportClosedCount || 0) + (type === 'transport-closed' ? 1 : 0);
    const sessionExpiredCount = (current.sessionExpiredCount || 0) + (type === 'session-expired' ? 1 : 0);
    const retryableErrorCount = (current.retryableErrorCount || 0) + (type === 'bridge-recovery-needed' ? 1 : 0);
    const stdioCloseCount = (current.stdioCloseCount || 0) + (type === 'stdio-close' ? 1 : 0);

    return persistBridgeTelemetry({
        connectCount,
        reconnectCount,
        transportClosedCount,
        sessionExpiredCount,
        retryableErrorCount,
        stdioCloseCount,
        events,
        lastEventType: type,
        lastEventAt: events[events.length - 1]?.at || nowIso(),
        ...details
    });
}

async function connectBridgeTransport(state, options = {}) {
    const sessionId = Object.prototype.hasOwnProperty.call(options, 'sessionId')
        ? options.sessionId
        : state.lastSessionId;
    const transportGeneration = (state.transportGeneration || 0) + 1;
    state.transportGeneration = transportGeneration;

    const transport = new StreamableHTTPClientTransport(
        DAEMON_URL,
        sessionId ? { sessionId } : undefined
    );
    state.httpTransport = transport;
    recordBridgeEvent(state.transportGeneration <= 1 ? 'bridge-connect' : 'bridge-reconnect', {
        sessionId: sessionId || null,
        transportGeneration,
        hasSessionId: Boolean(sessionId)
    });

    const isStaleTransport = () => state.httpTransport !== transport || state.transportGeneration !== transportGeneration;

    transport.onmessage = async (message) => {
        if (isStaleTransport()) {
            return;
        }

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

    transport.onerror = (err) => {
        if (!isStaleTransport()) {
            log(`http error: ${err.message}`);
            recordBridgeEvent('bridge-http-error', {
                message: String(err?.message || err || ''),
                sessionId: state.lastSessionId || state.httpTransport?._sessionId || null,
                transportGeneration
            });
        }
    };
    transport.onclose = async () => {
        if (isStaleTransport()) {
            return;
        }

    log('Daemon disconnected.');
    recordBridgeEvent('transport-closed', {
        sessionId: state.lastSessionId || state.httpTransport?._sessionId || null,
        transportGeneration
    });
    recordBridgeEvent('bridge-recovery-needed', {
        trigger: 'transport closed',
        sessionId: state.lastSessionId || state.httpTransport?._sessionId || null,
        transportGeneration
    });
    await startBridgeRecovery(state, 'transport closed', connectBridgeTransport);
};

    await transport.start();
}

async function handleBridgeStdioMessage(state, message) {
    const normalizedMessage = normalizeBridgeInitializeMessage(message);

    try {
        if (normalizedMessage?.method === 'initialize' && isRequestMessage(normalizedMessage)) {
            state.cachedInitializeRequest = normalizedMessage;
        } else if (
            normalizedMessage?.method === 'notifications/initialized' &&
            !Object.prototype.hasOwnProperty.call(normalizedMessage, 'id')
        ) {
            state.cachedInitializedNotification = normalizedMessage;
        }

        if (state.isReconnecting) {
            if (isRequestMessage(normalizedMessage)) {
                log(`Waiting for bridge recovery before forwarding ${normalizedMessage.method}.`);
                const recoveryPromise = state.reconnectPromise;
                if (recoveryPromise) {
                    try {
                        await recoveryPromise;
                    } catch (error) {
                        log(`Bridge recovery failed while waiting for ${normalizedMessage.method}: ${error.message}`);
                    }
                }
            } else {
                log('Dropping notification while daemon is restarting.');
                return;
            }
        }

        if (state.isReconnecting || !state.httpTransport) {
            log(`Rejecting request ${normalizedMessage?.method || 'unknown'} while daemon is restarting.`);
            if (isRequestMessage(normalizedMessage)) {
                await sendBridgeRetryableError(
                    state,
                    normalizedMessage.id,
                    'DAEMON_RESTARTING: bridge is recovering. Retry this request in a moment.',
                    { interruptedMethod: normalizedMessage.method }
                );
            }
            return;
        }

        if (isRequestMessage(normalizedMessage)) {
            state.pendingRequests.set(normalizedMessage.id, normalizedMessage);
        }

        if (normalizedMessage?.method !== 'initialize') {
            const sessionId = state.lastSessionId || state.httpTransport?._sessionId || await waitForBridgeSessionId(state);
            if (sessionId) {
                state.lastSessionId = sessionId;
            }
        }

        await state.httpTransport.send(normalizedMessage);
        if (state.httpTransport?._sessionId) {
            state.lastSessionId = state.httpTransport._sessionId;
        }
    } catch (err) {
        if (isSessionExpiredError(err)) {
            state.lastSessionId = null;
            const currentTransport = state.httpTransport;
            state.httpTransport = null;
            if (currentTransport) {
                currentTransport.close().catch(() => {});
            }
            recordBridgeEvent('session-expired', {
                method: normalizedMessage?.method || null,
                message: String(err?.message || err || ''),
                transportGeneration
            });
            recordBridgeEvent('bridge-recovery-needed', {
                trigger: 'session expired',
                method: normalizedMessage?.method || null,
                message: String(err?.message || err || ''),
                transportGeneration
            });
            void startBridgeRecovery(
                state,
                'session expired',
                connectBridgeTransport
            );
            return;
        }

        if (shouldTriggerRecovery(err)) {
            state.lastSessionId = null;
            const currentTransport = state.httpTransport;
            state.httpTransport = null;
            if (currentTransport) {
                currentTransport.close().catch(() => {});
            }
            recordBridgeEvent('bridge-recovery-needed', {
                method: normalizedMessage?.method || null,
                message: String(err?.message || err || ''),
                transportGeneration
            });
            void scheduleBridgeRecovery(
                state,
                'server rejected request after daemon restart',
                connectBridgeTransport
            );
        }

        if (isRequestMessage(normalizedMessage)) {
            state.pendingRequests.delete(normalizedMessage.id);
            await sendBridgeRetryableError(
                state,
                normalizedMessage.id,
                `BRIDGE_FORWARD_FAILED: ${err.message}`,
                { interruptedMethod: normalizedMessage.method }
            );
            return;
        }

        log(`Error forwarding IDE->daemon: ${err.message}`);
    }
}

function handleBridgeStdioClose(state) {
    log('IDE disconnected - shutting down bridge.');
    recordBridgeEvent('stdio-close', {
        sessionId: state.lastSessionId || null
    });
    if (state.httpTransport && !state.isReconnecting) {
        state.httpTransport.close().catch(() => {});
    }
    process.exit(0);
}

let sharedState = null;

const main = createCliOrchestrator({
    name: 'mcp:stdio-bridge',
    logger: {
        info: log,
        error: (msg, err) => log(`FATAL: ${msg} ${err?.message || err || ''}`),
        debug: () => {}
    },
    keepAlive: true,
    run: async () => {
        log(`Starting bridge for ${process.env.OMNYSYS_PROJECT_PATH || process.cwd()} - checking daemon...`);
        persistBridgeTelemetry({
            state: 'booting'
        });
        await waitForDaemonReady();

        log(`Daemon ready. Bridging stdio <-> ${DAEMON_URL}`);

        const stdioTransport = new StdioServerTransport();
        sharedState = createBridgeState(stdioTransport);

        await connectBridgeTransport(sharedState);

        stdioTransport.onmessage = async (message) => {
            await handleBridgeStdioMessage(sharedState, message);
        };

        stdioTransport.onerror = (err) => log(`stdio error: ${err.message}`);
        stdioTransport.onclose = () => {
            handleBridgeStdioClose(sharedState);
        };

        await stdioTransport.start();
        recordBridgeEvent('stdio-started', {});
        log('Bridge active.');
    }
});

main();
