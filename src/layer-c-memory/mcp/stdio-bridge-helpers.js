import { runAsyncBoundary } from '../../shared/compiler/index.js';
import { normalizeTransportOrigin } from './transport-provenance.js';
const DAEMON_URL = new URL(process.env.OMNYSYS_DAEMON_URL || 'http://127.0.0.1:9999/mcp');

// Client ID detection: env vars take priority, then detect from user agent
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

// Auto-detect client if not explicitly set
const autoDetectedClient = detectClientFromEnv() || detectClientFromUserAgent(process.env.OMNYSYS_USER_AGENT);

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
    return /Server not initialized|SESSION_EXPIRED|session expired|Invalid session|session not found/i.test(message);
}

export function isSessionExpiredError(error) {
    const message = String(error?.message || error || '');
    return /SESSION_EXPIRED|session expired|Invalid session|session not found/i.test(message);
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
    return DAEMON_URL;
}
