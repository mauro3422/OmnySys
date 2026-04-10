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
import { readDaemonHealth } from './mcp/stdio-bridge-health.js';
import {
    startBridgeRecovery,
    scheduleBridgeRecovery,
    ensureBridgeTransportReady,
    sendBridgeMessageWithRecovery
} from './mcp/stdio-bridge-recovery.js';
import {
    createBridgeTelemetryController,
    parseRestartRecoveryHint
} from './mcp/stdio-bridge-telemetry.js';
import {
    shouldPreconnectBridgeTransport,
    shouldPromoteBridgeTransportToSessionBound
} from './mcp/stdio-bridge-startup.js';
import {
    getDaemonUrl,
    getDaemonHealthUrl,
    buildInitializeResponse,
    buildRestartAcceptedResponse,
    isProxyManagedRestartArgs,
    isRestartServerToolCall,
    isRequestMessage,
    isResponseMessage,
    isSessionExpiredError,
    normalizeBridgeInitializeMessage,
    resolveRestartType,
    shouldTriggerRecovery,
    waitForBridgeSessionId
} from './mcp/stdio-bridge-helpers.js';

const DAEMON_URL = getDaemonUrl();
const DAEMON_HEALTH_URL = getDaemonHealthUrl();
const PROJECT_PATH = process.env.OMNYSYS_PROJECT_PATH || process.cwd();
const PROCESS_RESTART_RECOVERY_BACKOFF_MS = Number(process.env.OMNYSYS_PROCESS_RESTART_RECOVERY_BACKOFF_MS || 5000);

const {
    recordBridgeEvent,
    recordBridgeHealthCheck,
    persistBridgeTelemetry,
    getBridgeTelemetrySnapshot
} = createBridgeTelemetryController({
    projectPath: PROJECT_PATH,
    log
});

let bridgeTraceCounter = 0;

function persistBridgeSessionSnapshot(state, patch = {}) {
    persistBridgeTelemetry({
        ...patch,
        lastSessionId: state.lastSessionId || null,
        cachedInitializeRequest: state.cachedInitializeRequest || null,
        cachedInitializeResponse: state.cachedInitializeResponse || null,
        cachedInitializedNotification: state.cachedInitializedNotification || null,
        lastDaemonPid: state.lastDaemonPid || null,
        lastDaemonHealth: state.lastDaemonHealth || null,
        lastDaemonHealthAt: state.lastDaemonHealthAt || null,
        bridgeSessionStateUpdatedAt: new Date().toISOString()
    });
}

function createBridgeTraceId(label = 'bridge') {
    bridgeTraceCounter += 1;
    return `${label}-${Date.now()}-${bridgeTraceCounter}`;
}

function getBridgeClientRouteId(state) {
    return state.cachedInitializeRequest?.params?.clientInfo?.client_route_id
        || state.cachedInitializeRequest?.params?.clientInfo?.original_client_route_id
        || null;
}

function traceBridgeFlow(state, traceId, step, details = {}) {
    const sessionId = state.lastSessionId || state.httpTransport?._sessionId || null;
    const payload = {
        traceId,
        step,
        sessionId,
        clientRouteId: getBridgeClientRouteId(state),
        transportGeneration: state.transportGeneration || 0,
        isReconnecting: Boolean(state.isReconnecting),
        ...details
    };

    log(`[bridge-trace:${traceId}] ${step} :: ${JSON.stringify(payload)}`);
    recordBridgeEvent('bridge-trace', payload);
    persistBridgeSessionSnapshot(state, {
        bridgeTraceId: traceId,
        bridgeTraceStep: step
    });
    return payload;
}

function hydrateBridgeStateFromTelemetry(state) {
    const snapshot = getBridgeTelemetrySnapshot();
    if (!snapshot || typeof snapshot !== 'object') {
        return;
    }

    if (snapshot.lastSessionId) {
        state.lastSessionId = snapshot.lastSessionId;
    }

    if (snapshot.cachedInitializeRequest?.params) {
        state.cachedInitializeRequest = snapshot.cachedInitializeRequest;
    }

    if (snapshot.cachedInitializeResponse?.result) {
        state.cachedInitializeResponse = snapshot.cachedInitializeResponse;
    }

    if (snapshot.cachedInitializedNotification) {
        state.cachedInitializedNotification = snapshot.cachedInitializedNotification;
    }

    if (Number.isFinite(Number(snapshot.lastDaemonPid))) {
        state.lastDaemonPid = Number(snapshot.lastDaemonPid);
    }
}

async function flushCachedInitializedNotification(state) {
    if (!state.cachedInitializedNotification || !state.httpTransport) {
        return false;
    }

    if ((state.lastSessionId || state.httpTransport?._sessionId) && state.localInitializeHandled) {
        log('Skipping notifications/initialized replay for an already-initialized live session.');
        return false;
    }

    const sessionId = state.lastSessionId
        || state.httpTransport?._sessionId
        || await waitForBridgeSessionId(state, 10000);

    if (!sessionId) {
        log('Deferring notifications/initialized until the HTTP session is established.');
        return false;
    }

    state.lastSessionId = sessionId;

    try {
        await state.httpTransport.send(state.cachedInitializedNotification);
        persistBridgeSessionSnapshot(state, {
            bridgeTransportState: 'initialized-notification-flushed'
        });
        return true;
    } catch (error) {
        log(`Failed to flush initialized notification: ${error.message}`);
        return false;
    }
}

async function promoteBridgeTransportToSessionBound(state) {
    const sessionId = state.lastSessionId
        || state.httpTransport?._sessionId
        || await waitForBridgeSessionId(state, 10000);

    if (!state.transportBootstrappedSessionlessly || !sessionId) {
        return false;
    }

    const currentTransport = state.httpTransport;
    state.httpTransport = null;
    if (currentTransport) {
        currentTransport.close().catch(() => {});
    }

    await connectBridgeTransport(state, { sessionId });
    state.lastSessionId = sessionId;
    state.transportBootstrappedSessionlessly = false;
    persistBridgeSessionSnapshot(state, {
        bridgeTransportState: 'session-bound-upgrade',
        bridgeTransportSessionId: sessionId
    });
    return true;
}

async function connectBridgeTransport(state, options = {}) {
    const sessionId = Object.prototype.hasOwnProperty.call(options, 'sessionId')
        ? options.sessionId
        : state.lastSessionId;
    const transportGeneration = (state.transportGeneration || 0) + 1;
    state.transportGeneration = transportGeneration;
    const traceId = state.activeBridgeTraceId || createBridgeTraceId('bridge-connect');
    state.activeBridgeTraceId = traceId;

    const transport = new StreamableHTTPClientTransport(
        DAEMON_URL,
        sessionId ? { sessionId } : undefined
    );
    state.httpTransport = transport;
    state.transportBootstrappedSessionlessly = !Boolean(sessionId);
    traceBridgeFlow(state, traceId, 'transport-create', {
        sessionId: sessionId || null,
        transportGeneration,
        hasSessionId: Boolean(sessionId)
    });
    recordBridgeEvent(state.transportGeneration <= 1 ? 'bridge-connect' : 'bridge-reconnect', {
        traceId,
        sessionId: sessionId || null,
        transportGeneration,
        hasSessionId: Boolean(sessionId)
    });
    persistBridgeSessionSnapshot(state, {
        bridgeTransportGeneration: transportGeneration,
        bridgeTransportSessionId: sessionId || null,
        bridgeTransportState: 'connected',
        bridgeTraceId: traceId,
        bridgeTraceStep: 'transport-create'
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
                const pendingRequest = state.pendingRequests.get(message.id);
                if (pendingRequest?.method === 'initialize' && message.result) {
                    state.cachedInitializeResponse = {
                        jsonrpc: message.jsonrpc || '2.0',
                        id: message.id,
                        result: message.result
                    };
                    persistBridgeSessionSnapshot(state, {
                        bridgeTransportState: 'initialize-response-cached'
                    });
                }
                state.pendingRequests.delete(message.id);
                traceBridgeFlow(state, traceId, 'daemon-response', {
                    messageId: message.id,
                    hasError: Boolean(message.error),
                    hasResult: Boolean(message.result)
                });
            }

            await state.stdioTransport.send(message);

            const restartRecoveryHint = parseRestartRecoveryHint(message);
            if (restartRecoveryHint && !state.isReconnecting) {
                const trigger = restartRecoveryHint?.bridgeRecovery?.trigger || 'server rejected request after daemon restart';
                recordBridgeEvent('bridge-recovery-needed', {
                    trigger,
                    reason: 'restart_server response requested proxy-managed restart',
                    sessionId: state.lastSessionId || state.httpTransport?._sessionId || null,
                    transportGeneration
                });
                void scheduleBridgeRecovery(
                    state,
                    trigger,
                    connectBridgeTransport,
                    {
                        forceFreshSession: restartRecoveryHint?.bridgeRecovery?.forceFreshSession === true,
                        backoffMs: restartRecoveryHint?.bridgeRecovery?.retryAfterMs ?? 250
                    }
                );
            }
        } catch (err) {
            log(`Error forwarding daemon->IDE: ${err.message}`);
        }
    };

    transport.onerror = (err) => {
        if (!isStaleTransport()) {
            log(`http error: ${err.message}`);
            traceBridgeFlow(state, traceId, 'transport-error', {
                message: String(err?.message || err || '')
            });
            recordBridgeEvent('bridge-http-error', {
                traceId,
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

        const closedSessionId = state.lastSessionId || state.httpTransport?._sessionId || null;
        state.httpTransport = null;

        log('Daemon disconnected.');
        traceBridgeFlow(state, traceId, 'transport-close', {
            sessionId: closedSessionId,
            transportGeneration
        });
        recordBridgeEvent('transport-closed', {
            traceId,
            sessionId: closedSessionId,
            transportGeneration
        });
        recordBridgeEvent('bridge-recovery-needed', {
            traceId,
            trigger: 'transport closed',
            sessionId: closedSessionId,
            transportGeneration
        });
        persistBridgeSessionSnapshot(state, {
            bridgeTransportGeneration: transportGeneration,
            bridgeTransportSessionId: closedSessionId,
            bridgeTransportState: 'closed',
            bridgeTraceId: traceId,
            bridgeTraceStep: 'transport-close'
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
            persistBridgeSessionSnapshot(state, {
                bridgeTransportState: 'initialize-cached'
            });

            const daemonSessionCount = Number(state.lastDaemonHealth?.sessions || 0);
            const daemonHealthIsFresh = Boolean(
                state.lastDaemonHealth?.healthy &&
                Number.isFinite(daemonSessionCount) &&
                daemonSessionCount > 0
            );
            const liveSessionId = daemonHealthIsFresh
                ? (state.lastSessionId || state.httpTransport?._sessionId || null)
                : null;

            if (!daemonHealthIsFresh) {
                state.lastSessionId = null;
                state.cachedInitializeResponse = null;
                state.localInitializeHandled = false;
            }

            if (liveSessionId) {
                const initializeResponse = buildInitializeResponse(
                    normalizedMessage.id,
                    state.cachedInitializeResponse
                );
                state.cachedInitializeResponse = initializeResponse;
                state.localInitializeHandled = true;
                persistBridgeSessionSnapshot(state, {
                    bridgeTransportState: 'initialize-responded-locally'
                });
                await state.stdioTransport.send(initializeResponse);
                log(`Responded to initialize locally for live MCP session ${liveSessionId}.`);
                return;
            }
        } else if (
            normalizedMessage?.method === 'notifications/initialized' &&
            !Object.prototype.hasOwnProperty.call(normalizedMessage, 'id')
        ) {
            state.cachedInitializedNotification = normalizedMessage;
            persistBridgeSessionSnapshot(state, {
                bridgeTransportState: 'initialized-notification-cached'
            });

            if (state.localInitializeHandled && (state.lastSessionId || state.httpTransport?._sessionId)) {
                log('Dropping notifications/initialized for already-initialized live session.');
                return;
            }
        }

        const restartToolArgs = normalizedMessage?.params?.arguments
            || normalizedMessage?.params?.args
            || normalizedMessage?.params
            || {};
        const isProxyManagedRestartRequest =
            isRestartServerToolCall(normalizedMessage) &&
            isProxyManagedRestartArgs(restartToolArgs);

        if (isProxyManagedRestartRequest) {
            const restartTraceId = createBridgeTraceId('restart');
            const restartType = resolveRestartType(restartToolArgs);
            const recoveryBackoffMs = restartToolArgs?.reanalyze
                ? 15000
                : PROCESS_RESTART_RECOVERY_BACKOFF_MS;
            state.activeBridgeTraceId = restartTraceId;
            // The restart request must ACK locally before the daemon is torn down,
            // otherwise the client sees a transport error instead of a valid tool result.
            traceBridgeFlow(state, restartTraceId, 'restart-request-received', {
                method: normalizedMessage.method || 'tools/call',
                toolName: normalizedMessage?.params?.name || normalizedMessage?.params?.tool || 'mcp_omnysystem_restart_server',
                processRestart: Boolean(restartToolArgs?.processRestart),
                restartType
            });

            const restartTimeout = setTimeout(() => {
                state.internalRequests.delete(normalizedMessage.id);
            }, 30000);
            restartTimeout.unref?.();

            state.internalRequests.set(normalizedMessage.id, {
                resolve: () => {},
                reject: () => {},
                timeout: restartTimeout
            });

            const restartAck = buildRestartAcceptedResponse(normalizedMessage.id, restartToolArgs, {
                retryAfterMs: recoveryBackoffMs,
                estimatedReadyAt: new Date(Date.now() + recoveryBackoffMs).toISOString()
            });
            await state.stdioTransport.send(restartAck);
            traceBridgeFlow(state, restartTraceId, 'restart-ack-sent', {
                processRestart: Boolean(restartToolArgs?.processRestart),
                ackHasStructuredContent: Boolean(restartAck?.result?.structuredContent),
                ackHasTextContent: Boolean(Array.isArray(restartAck?.result?.content) && restartAck.result.content.length > 0)
            });
            persistBridgeSessionSnapshot(state, {
                bridgeTransportState: 'restart-acknowledged-locally',
                bridgeTraceId: restartTraceId,
                bridgeTraceStep: 'restart-ack-sent'
            });

            log(`Restart request acknowledged locally before forwarding proxy-managed restart for session ${state.lastSessionId || state.httpTransport?._sessionId || 'unknown'}. Trace ${restartTraceId}.`);
            if (state.httpTransport) {
                traceBridgeFlow(state, restartTraceId, 'restart-forward-queued', {
                    sessionId: state.lastSessionId || state.httpTransport?._sessionId || null,
                    transportGeneration: state.transportGeneration || 0
                });
                void state.httpTransport.send(normalizedMessage).catch((error) => {
                    traceBridgeFlow(state, restartTraceId, 'restart-forward-failed', {
                        message: String(error?.message || error || '')
                    });
                    log(`Restart forward failed after local ACK: ${error.message}`);
                });
            }

            traceBridgeFlow(state, restartTraceId, 'restart-recovery-scheduled', {
                forceFreshSession: true,
                backoffMs: recoveryBackoffMs,
                estimatedReadyAt: new Date(Date.now() + recoveryBackoffMs).toISOString()
            });
            // Recovery runs asynchronously so the ACK path stays stable even if the daemon
            // temporarily drops the underlying HTTP transport during SIGTERM/respawn.
            void scheduleBridgeRecovery(state, `${restartType} requested`, connectBridgeTransport, {
                forceFreshSession: true,
                backoffMs: recoveryBackoffMs
            }).catch((error) => {
                traceBridgeFlow(state, restartTraceId, 'restart-recovery-schedule-failed', {
                    message: String(error?.message || error || '')
                });
                log(`Restart recovery scheduling failed after local ACK: ${error.message}`);
            });
            return;
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

        if (!state.httpTransport) {
            log(`No active HTTP transport for ${normalizedMessage?.method || 'unknown'} — attempting session recovery.`);
            try {
                await ensureBridgeTransportReady(state, connectBridgeTransport, {
                    trigger: normalizedMessage?.method || 'bridge request',
                    forceFreshSession: false,
                    backoffMs: 0
                });
            } catch (error) {
                log(`Bridge transport recovery failed: ${error.message}`);
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

            if (shouldPromoteBridgeTransportToSessionBound({
                transportBootstrappedSessionlessly: state.transportBootstrappedSessionlessly,
                sessionId: state.lastSessionId,
                messageMethod: normalizedMessage?.method || null
            })) {
                await promoteBridgeTransportToSessionBound(state);
            }
        }

        await sendBridgeMessageWithRecovery(state, normalizedMessage, connectBridgeTransport, {
            trigger: normalizedMessage?.method || 'bridge send',
            backoffMs: 0
        });
        if (state.httpTransport?._sessionId) {
            state.lastSessionId = state.httpTransport._sessionId;
            persistBridgeSessionSnapshot(state, {
                bridgeTransportState: 'message-sent'
            });
        }

        if (normalizedMessage?.method === 'initialize') {
            await flushCachedInitializedNotification(state);
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
            persistBridgeSessionSnapshot(state, {
                lastSessionId: null,
                bridgeTransportState: 'session-expired'
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
            persistBridgeSessionSnapshot(state, {
                lastSessionId: null,
                bridgeTransportState: 'recovering'
            });
            void scheduleBridgeRecovery(
                state,
                'server rejected request after daemon restart',
                connectBridgeTransport
            );
        }

        if (isRequestMessage(normalizedMessage)) {
            state.pendingRequests.delete(normalizedMessage.id);
            if (isRestartServerToolCall(normalizedMessage) && shouldTriggerRecovery(err)) {
                const restartArgs = normalizedMessage?.params?.arguments
                    || normalizedMessage?.params?.args
                    || normalizedMessage?.params
                    || {};
                const restartResponse = buildRestartAcceptedResponse(normalizedMessage.id, restartArgs, {
                    retryAfterMs: restartArgs?.reanalyze ? 15000 : PROCESS_RESTART_RECOVERY_BACKOFF_MS,
                    estimatedReadyAt: new Date(Date.now() + (restartArgs?.reanalyze ? 15000 : PROCESS_RESTART_RECOVERY_BACKOFF_MS)).toISOString()
                });

                await state.stdioTransport.send(restartResponse);
                log('Restart request acknowledged locally while bridge recovery continues.');
                return;
            }
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
    persistBridgeSessionSnapshot(state, {
        bridgeTransportState: 'stdio-close'
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
        sharedState.persistBridgeSessionSnapshot = (patch = {}) => persistBridgeSessionSnapshot(sharedState, patch);
        hydrateBridgeStateFromTelemetry(sharedState);

        const previousDaemonPid = Number(sharedState.lastDaemonPid || sharedState.lastDaemonHealth?.pid || 0);
        const daemonHealth = await readDaemonHealth(DAEMON_HEALTH_URL);
        sharedState.lastDaemonHealth = daemonHealth || null;
        sharedState.lastDaemonHealthAt = new Date().toISOString();
        const currentDaemonPid = Number(daemonHealth?.pid || 0);
        const daemonPidChanged = Boolean(previousDaemonPid && currentDaemonPid && previousDaemonPid !== currentDaemonPid);
        if (Number.isFinite(currentDaemonPid) && currentDaemonPid > 0) {
            sharedState.lastDaemonPid = currentDaemonPid;
        }
        recordBridgeHealthCheck(daemonHealth, {
            bridgeTransportState: daemonHealth?.healthy ? 'daemon-health-ok' : 'daemon-health-unhealthy'
        });
        if (daemonHealth?.healthy && (daemonPidChanged || daemonHealth.sessions === 0) && sharedState.lastSessionId) {
            const reason = daemonPidChanged
                ? `daemon pid changed (${previousDaemonPid} -> ${currentDaemonPid})`
                : 'daemon reported zero active sessions';
            log(`No active daemon session continuity detected; clearing stale bridge session ${sharedState.lastSessionId} (${reason}).`);
            sharedState.lastSessionId = null;
            sharedState.cachedInitializeResponse = null;
            sharedState.localInitializeHandled = false;
            persistBridgeSessionSnapshot(sharedState, {
                bridgeTransportState: daemonPidChanged ? 'daemon-pid-changed' : 'stale-session-cleared'
            });
        }

        if (shouldPreconnectBridgeTransport({
            lastSessionId: sharedState.lastSessionId,
            lastDaemonHealth: daemonHealth
        })) {
            await connectBridgeTransport(sharedState);
        } else {
            persistBridgeSessionSnapshot(sharedState, {
                bridgeTransportState: 'cold-start-awaiting-initialize'
            });
        }

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
