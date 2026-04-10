import { nowIso } from '#shared/utils/normalize-helpers.js';
import {
  readBridgeRuntimeTelemetry,
  writeBridgeRuntimeTelemetrySync,
  summarizeBridgeRuntimeTelemetry
} from '../../shared/compiler/index.js';

function normalizeNamespacePart(value) {
  return String(value || '').trim().replace(/\s+/g, '-').replace(/[:/\\]+/g, '-');
}

export function resolveBridgeTelemetryNamespace({
  env = process.env,
  platform = process.platform
} = {}) {
  const explicitNamespace = normalizeNamespacePart(env.OMNYSYS_BRIDGE_TELEMETRY_NAMESPACE);
  if (explicitNamespace) {
    return explicitNamespace;
  }

  const wslDistro = normalizeNamespacePart(env.WSL_DISTRO_NAME);
  const hostFlavor = platform === 'win32'
    ? 'windows'
    : (wslDistro || env.WSL_INTEROP ? 'wsl' : 'unix');
  const clientTag = normalizeNamespacePart(env.OMNYSYS_CLIENT_ROUTE_BASE || env.OMNYSYS_CLIENT_ID || env.OMNYSYS_CLIENT_NAME || 'unknown');

  return [hostFlavor, wslDistro, clientTag].filter(Boolean).join(':');
}

export function createBridgeTelemetryController({ projectPath, log, bridgeNamespace = 'default' }) {
  let bridgeTelemetry = readBridgeRuntimeTelemetry(projectPath) || null;

  if (bridgeTelemetry && bridgeTelemetry.bridgeNamespace && bridgeTelemetry.bridgeNamespace !== bridgeNamespace) {
    bridgeTelemetry = null;
  }

  function persistBridgeTelemetry(patch = {}) {
    bridgeTelemetry = {
      ...(bridgeTelemetry || {}),
      projectPath,
      bridgeNamespace,
      updatedAt: nowIso(),
      ...patch
    };

    try {
      writeBridgeRuntimeTelemetrySync(projectPath, bridgeTelemetry);
    } catch (error) {
      log(`bridge telemetry persist failed: ${error.message}`);
    }

    return bridgeTelemetry;
  }

  function deriveBridgeHealthPatch(nextTelemetry) {
    const summary = summarizeBridgeRuntimeTelemetry(nextTelemetry);

    return {
      state: summary.state || nextTelemetry.state || null,
      bridgeHealthState: summary.healthState || summary.state || null,
      bridgeRiskLevel: summary.riskLevel || null,
      bridgeWarningReasons: summary.warningReasons || [],
      bridgeWarningSignals: summary.warningSignals || [],
      bridgeHealthSummary: summary.summary || null,
      bridgeHealthRecommendation: summary.recommendation || null,
      lastDaemonPid: summary.lastDaemonPid ?? nextTelemetry.lastDaemonPid ?? null,
      lastDaemonHealth: summary.lastDaemonHealth || nextTelemetry.lastDaemonHealth || null,
      lastDaemonHealthAt: summary.lastDaemonHealthAt || nextTelemetry.lastDaemonHealthAt || null
    };
  }

  function recordBridgeEvent(type, details = {}) {
    const current = bridgeTelemetry || { events: [] };
    const events = Array.isArray(current.events) ? current.events.slice(-29) : [];
    events.push({ type, at: nowIso(), ...details });

    const nextTelemetry = {
      ...(bridgeTelemetry || {}),
      projectPath,
      bridgeNamespace,
      updatedAt: nowIso(),
      connectCount: (current.connectCount || 0) + (type === 'bridge-connect' ? 1 : 0),
      reconnectCount: (current.reconnectCount || 0) + (type === 'bridge-reconnect' ? 1 : 0),
      transportClosedCount: (current.transportClosedCount || 0) + (type === 'transport-closed' ? 1 : 0),
      sessionExpiredCount: (current.sessionExpiredCount || 0) + (type === 'session-expired' ? 1 : 0),
      retryableErrorCount: (current.retryableErrorCount || 0) + (type === 'bridge-recovery-needed' ? 1 : 0),
      stdioCloseCount: (current.stdioCloseCount || 0) + (type === 'stdio-close' ? 1 : 0),
      events,
      lastEventType: type,
      lastEventAt: events[events.length - 1]?.at || nowIso(),
      ...details
    };

    return persistBridgeTelemetry({
      ...nextTelemetry,
      ...deriveBridgeHealthPatch(nextTelemetry)
    });
  }

  function recordBridgeHealthCheck(health = null, details = {}) {
    const nextTelemetry = {
      ...(bridgeTelemetry || {}),
      projectPath,
      bridgeNamespace,
      updatedAt: nowIso(),
      lastDaemonHealth: health || null,
      lastDaemonHealthAt: nowIso(),
      ...details
    };

    return persistBridgeTelemetry({
      ...nextTelemetry,
      ...deriveBridgeHealthPatch(nextTelemetry)
    });
  }

  return {
    getBridgeTelemetrySnapshot: () => bridgeTelemetry,
    persistBridgeTelemetry,
    recordBridgeEvent,
    recordBridgeHealthCheck
  };
}

export function parseRestartRecoveryHint(message) {
  const content = message?.result?.content;
  if (!Array.isArray(content)) {
    return null;
  }

  for (const item of content) {
    if (item?.type !== 'text' || typeof item.text !== 'string') {
      continue;
    }

    try {
      const payload = JSON.parse(item.text);
      if (
        payload?.restarting === true &&
        payload?.bridgeRecovery?.state === 'recovering' &&
        payload?.bridgeRecovery?.forceFreshSession === true
      ) {
        return payload;
      }
    } catch {
      // Ignore non-JSON tool output.
    }
  }

  return null;
}
