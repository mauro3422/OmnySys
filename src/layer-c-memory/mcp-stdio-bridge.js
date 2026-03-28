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

const DAEMON_URL = new URL(process.env.OMNYSYS_DAEMON_URL || 'http://127.0.0.1:9999/mcp');
const BRIDGE_CLIENT_ID = String(process.env.OMNYSYS_CLIENT_ID || '').trim();
const BRIDGE_CLIENT_NAME = String(process.env.OMNYSYS_CLIENT_NAME || '').trim();

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

function canonicalizeClientInfo(clientInfo = {}) {
    const base = clientInfo && typeof clientInfo === 'object' ? { ...clientInfo } : {};
    const originalName = getTrimmedClientField(base, 'name');
    const originalClientId = getTrimmedClientField(base, 'client_id');
    const canonicalId = resolveCanonicalClientId(originalClientId, originalName);
    const canonicalName = resolveCanonicalClientName(originalName, originalClientId, canonicalId);

    return buildCanonicalClientInfo(base, canonicalName, canonicalId, originalName, originalClientId);
}

function getTrimmedClientField(clientInfo, field) {
    const value = clientInfo?.[field];
    return typeof value === 'string' ? value.trim() : '';
}

function resolveCanonicalClientId(originalClientId, originalName) {
    return BRIDGE_CLIENT_ID || originalClientId || originalName || '';
}

function resolveCanonicalClientName(originalName, originalClientId, canonicalId) {
    return BRIDGE_CLIENT_NAME || canonicalId || originalName || originalClientId || '';
}

function buildCanonicalClientInfo(base, canonicalName, canonicalId, originalName, originalClientId) {
    const normalized = { ...base };
    if (canonicalName) {
        normalized.name = canonicalName;
    }
    if (canonicalId) {
        normalized.client_id = canonicalId;
    }

    if (BRIDGE_CLIENT_ID && originalName && originalName !== canonicalName) {
        normalized.original_name = originalName;
    }
    if (BRIDGE_CLIENT_ID && originalClientId && originalClientId !== canonicalId) {
        normalized.original_client_id = originalClientId;
    }

    return normalized;
}

function normalizeBridgeInitializeMessage(message) {
    if (!isRequestMessage(message) || message.method !== 'initialize') {
        return message;
    }

    const params = message.params && typeof message.params === 'object'
        ? { ...message.params }
        : {};
    params.clientInfo = canonicalizeClientInfo(params.clientInfo);

    return {
        ...message,
        params
    };
}

async function connectBridgeTransport(state, options = {}) {
    const sessionId = Object.prototype.hasOwnProperty.call(options, 'sessionId')
        ? options.sessionId
        : state.lastSessionId;

    state.httpTransport = new StreamableHTTPClientTransport(
        DAEMON_URL,
        sessionId ? { sessionId } : undefined
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
        await startBridgeRecovery(state, 'transport closed', connectBridgeTransport);
    };

    await state.httpTransport.start();
}

async function handleBridgeStdioMessage(state, message) {
    const normalizedMessage = normalizeBridgeInitializeMessage(message);

    if (state.isReconnecting) {
        if (isRequestMessage(normalizedMessage)) {
            log(`Rejecting request ${normalizedMessage.method} while daemon is restarting.`);
            await sendBridgeRetryableError(
                state,
                normalizedMessage.id,
                'DAEMON_RESTARTING: bridge is recovering. Retry this request in a moment.',
                { interruptedMethod: normalizedMessage.method }
            );
            return;
        }

        log('Dropping notification while daemon is restarting.');
        return;
    }

    try {
        if (normalizedMessage?.method === 'initialize' && isRequestMessage(normalizedMessage)) {
            state.cachedInitializeRequest = normalizedMessage;
        } else if (
            normalizedMessage?.method === 'notifications/initialized' &&
            !Object.prototype.hasOwnProperty.call(normalizedMessage, 'id')
        ) {
            state.cachedInitializedNotification = normalizedMessage;
        }

        if (isRequestMessage(normalizedMessage)) {
            state.pendingRequests.set(normalizedMessage.id, normalizedMessage);
        }

        await state.httpTransport.send(normalizedMessage);
        if (state.httpTransport?._sessionId) {
            state.lastSessionId = state.httpTransport._sessionId;
        }
    } catch (err) {
        if (shouldTriggerRecovery(err)) {
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
        log('Bridge active.');
    }
});

main();
