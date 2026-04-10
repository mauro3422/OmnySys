import { runAsyncBoundary } from '../../shared/compiler/index.js';
import { normalizeTransportOrigin } from './transport-provenance.js';
import { execSync } from 'child_process';
import { buildHealthUrl, buildMcpUrl } from '../../shared/mcp-endpoints.js';

// Client ID detection: env vars take priority, then auto-detect from parent process
function detectClientFromEnv() {
    const envId = String(process.env.OMNYSYS_CLIENT_ID || '').trim();
    const envName = String(process.env.OMNYSYS_CLIENT_NAME || '').trim();
    if (envId || envName) return { id: envId, name: envName };
    return null;
}

function detectClientFromUserAgent(userAgent) {
    if (!userAgent) return null;
    const ua = userAgent.toLowerCase();
    if (ua.includes('qwen') || ua.includes('qwen-code')) return { id: 'qwen-code', name: 'Qwen Code' };
    if (ua.includes('codex')) return { id: 'codex', name: 'Codex' };
    if (ua.includes('cline')) return { id: 'cline', name: 'Cline' };
    if (ua.includes('claude')) return { id: 'claude', name: 'Claude' };
    if (ua.includes('cursor')) return { id: 'cursor', name: 'Cursor' };
    if (ua.includes('copilot')) return { id: 'copilot', name: 'GitHub Copilot' };
    return null;
}

function detectClientFromParentProcess() {
    try {
        const ppid = process.ppid;
        if (!ppid) return null;

        const command = process.platform === 'win32'
            ? `wmic process where ProcessId=${ppid} get Name`
            : `ps -o command= -p ${ppid}`;
        const output = execSync(command, { encoding: 'utf8', timeout: 2000 });
        const parentName = output.toLowerCase();
        
        // Detect based on parent process
        if (parentName.includes('qwen') || parentName.includes('qwen-code')) return { id: 'qwen-code', name: 'Qwen Code' };
        if (parentName.includes('codex')) return { id: 'codex', name: 'Codex' };
        if (parentName.includes('cline')) return { id: 'cline', name: 'Cline' };
        if (parentName.includes('claude')) return { id: 'claude', name: 'Claude' };
        if (parentName.includes('cursor')) return { id: 'cursor', name: 'Cursor' };
        
        // If parent is VS Code, check grandparent or use heuristic
        if (
            parentName.includes('code.exe') ||
            parentName.includes('visual studio code') ||
            /\bcode(\s|$)/.test(parentName) ||
            parentName.includes('vscode')
        ) {
            // Running under VS Code - could be any AI extension
            // Default to 'vscode-ai' since we can't determine which one
            return { id: 'vscode-ai', name: 'VS Code AI' };
        }
        
        return null;
    } catch {
        // wmic may fail or timeout, ignore
        return null;
    }
}

function resolveClientRouteId(baseId) {
    const explicitRouteId = String(process.env.OMNYSYS_CLIENT_ROUTE_ID || '').trim();
    if (explicitRouteId) {
        return explicitRouteId;
    }

    const routeBase = String(baseId || BRIDGE_CLIENT_ID || BRIDGE_CLIENT_NAME || 'unknown').trim() || 'unknown';
    const parentPid = Number(process.ppid || 0) || process.pid || 0;
    return `${routeBase}::${parentPid}`;
}

// Auto-detect client: env vars > user agent > parent process
const autoDetectedClient = detectClientFromEnv() || detectClientFromUserAgent(process.env.OMNYSYS_USER_AGENT) || detectClientFromParentProcess();

const BRIDGE_CLIENT_ID = autoDetectedClient?.id || '';
const BRIDGE_CLIENT_NAME = autoDetectedClient?.name || '';
const BRIDGE_CLIENT_VERSION = String(process.env.OMNYSYS_CLIENT_VERSION || process.version || '0.0.0').trim();

export function isRequestMessage(message) {
    return !!message &&
        typeof message === 'object' &&
        typeof message.method === 'string' &&
        Object.prototype.hasOwnProperty.call(message, 'id');
}

export function isResponseMessage(message) {
    return !!message &&
        typeof message === 'object' &&
        !Object.prototype.hasOwnProperty.call(message, 'method') &&
        Object.prototype.hasOwnProperty.call(message, 'id');
}

export function shouldTriggerRecovery(error) {
    const message = String(error?.message || error || '');
    return /Server not initialized|SESSION_EXPIRED|session expired|Invalid session|session not found|invalid or missing MCP session|missing MCP session|Failed to open SSE stream: Conflict|session conflict|\bConflict\b|BRIDGE_FORWARD_FAILED|fetch failed|Failed to fetch|socket hang up|terminated/i.test(message);
}

export function isSessionExpiredError(error) {
    const message = String(error?.message || error || '');
    return /SESSION_EXPIRED|session expired|Invalid session|session not found|invalid or missing MCP session|missing MCP session|Failed to open SSE stream: Conflict|session conflict|\bConflict\b|BRIDGE_FORWARD_FAILED|fetch failed|Failed to fetch|socket hang up|terminated/i.test(message);
}

export function buildInitializeResponse(requestId, cachedResponse = null) {
    if (cachedResponse?.result && typeof cachedResponse.result === 'object') {
        return {
            jsonrpc: '2.0',
            id: requestId,
            result: cachedResponse.result
        };
    }

    return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
            protocolVersion: '2025-11-25',
            capabilities: {
                tools: {},
                resources: {}
            },
            serverInfo: {
                name: 'omnysys',
                version: '3.0.0'
            }
        }
    };
}

export function resolveRestartType(args = {}) {
    if (args?.refreshOnly) return 'refresh_only';
    if (args?.softReload) return 'soft_reload';
    if (args?.clearCacheOnly) return 'cache_only_flush';
    if (args?.processRestart) return 'true_process_restart';
    if (args?.reindexOnly) return 'reindex_only';
    if (args?.reanalyze) return 'proxy_reanalyze';
    if (args?.clearCache) return 'legacy_proxy_restart_with_clear_cache';
    return 'legacy_proxy_restart';
}

export function isProxyManagedRestartArgs(args = {}) {
    const restartType = resolveRestartType(args);
    return !['refresh_only', 'soft_reload', 'cache_only_flush', 'reindex_only'].includes(restartType);
}

export function buildRestartAcceptedResponse(requestId, args = {}, options = {}) {
    const restartType = resolveRestartType(args);
    const processRestart = Boolean(args?.processRestart);
    const proxyManagedRestart = isProxyManagedRestartArgs(args);
    const defaultRetryAfterMs = args?.reanalyze
        ? 15000
        : (proxyManagedRestart ? 5000 : 0);
    const retryAfterMs = Number.isFinite(Number(options.retryAfterMs))
        ? Math.max(0, Number(options.retryAfterMs))
        : defaultRetryAfterMs;
    const estimatedReadyAt = options.estimatedReadyAt || (retryAfterMs > 0
        ? new Date(Date.now() + retryAfterMs).toISOString()
        : null);
    const payload = {
        success: true,
        restarting: true,
        processRestart,
        proxyManagedRestart,
        restartType,
        message: proxyManagedRestart
            ? `Restart request accepted. The bridge is recovering and will reconnect automatically. Estimated ready in about ${Math.max(1, Math.ceil(retryAfterMs / 1000))}s.`
            : 'Restart request accepted.',
        bridgeRecovery: proxyManagedRestart
            ? {
                state: 'recovering',
                retryAfterMs,
                estimatedReadyAt,
                forceFreshSession: true,
                suggestedRetryMethods: ['get_server_status', 'list_tools']
            }
            : {
                state: 'accepted',
                retryAfterMs: 0,
                estimatedReadyAt: null,
                suggestedRetryMethods: []
            },
        timestamp: new Date().toISOString()
    };
    return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
            structuredContent: payload,
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(payload, null, 2)
                }
            ]
        }
    };
}

export function isRestartServerToolCall(message) {
    if (!isRequestMessage(message)) {
        return false;
    }

    if (message.method === 'restart_server') {
        return true;
    }

    const toolName = String(message?.params?.name || message?.params?.tool || '').trim();
    return message.method === 'tools/call' && toolName === 'mcp_omnysystem_restart_server';
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

function resolveCanonicalClientVersion(originalVersion) {
    return BRIDGE_CLIENT_VERSION || originalVersion || process.version || '0.0.0';
}

function buildCanonicalClientInfo(base, canonicalName, canonicalId, canonicalVersion, originalName, originalClientId) {
    const normalized = { ...base };
    if (canonicalName) {
        normalized.name = canonicalName;
    }
    if (canonicalId) {
        normalized.client_id = canonicalId;
    }
    if (canonicalVersion) {
        normalized.version = canonicalVersion;
    }

    if (BRIDGE_CLIENT_ID && originalName && originalName !== canonicalName) {
        normalized.original_name = originalName;
    }
    if (BRIDGE_CLIENT_ID && originalClientId && originalClientId !== canonicalId) {
        normalized.original_client_id = originalClientId;
    }

    const routeId = resolveClientRouteId(canonicalId || originalClientId || originalName);
    normalized.client_route_id = routeId;
    normalized.original_client_route_id = normalized.original_client_route_id || routeId;

    if (!normalized.transport_origin) {
        normalized.transport_origin = normalizeTransportOrigin('stdio_bridge', 'stdio_bridge');
    } else {
        normalized.transport_origin = normalizeTransportOrigin(normalized.transport_origin, 'stdio_bridge');
    }
    normalized.transport_origin_source = normalized.transport_origin_source || 'stdio_bridge';

    return normalized;
}

export function canonicalizeClientInfo(clientInfo = {}) {
    const base = clientInfo && typeof clientInfo === 'object' ? { ...clientInfo } : {};
    const originalName = getTrimmedClientField(base, 'name');
    const originalClientId = getTrimmedClientField(base, 'client_id');
    const originalVersion = getTrimmedClientField(base, 'version');
    const canonicalId = resolveCanonicalClientId(originalClientId, originalName);
    const canonicalName = resolveCanonicalClientName(originalName, originalClientId, canonicalId);
    const canonicalVersion = resolveCanonicalClientVersion(originalVersion);

    return buildCanonicalClientInfo(
        base,
        canonicalName,
        canonicalId,
        canonicalVersion,
        originalName,
        originalClientId
    );
}

export function normalizeBridgeInitializeMessage(message) {
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

export async function waitForBridgeSessionId(state, timeoutMs = 2500) {
    return await runAsyncBoundary('waitForBridgeSessionId', async () => {
        try {
            const deadline = Date.now() + timeoutMs;

            while (Date.now() < deadline) {
                const sessionId = state.lastSessionId || state.httpTransport?._sessionId;
                if (sessionId) {
                    return sessionId;
                }

                await new Promise((resolve) => setTimeout(resolve, 25));
            }

            return state.lastSessionId || state.httpTransport?._sessionId || null;
        } catch (error) {
            throw error;
        }
    }, { fallback: null });
}

export function getDaemonUrl() {
    return new URL(process.env.OMNYSYS_DAEMON_URL || buildMcpUrl({
        port: 9999,
        env: process.env,
        platform: process.platform
    }));
}

export function getDaemonHealthUrl() {
    return process.env.OMNYSYS_HEALTH_URL || buildHealthUrl({
        port: 9999,
        env: process.env,
        platform: process.platform
    });
}
