import { nowIso } from '#shared/utils/normalize-helpers.js';
import {
  readBridgeRuntimeTelemetry,
  writeBridgeRuntimeTelemetrySync,
  summarizeBridgeRuntimeTelemetry
} from '../../shared/compiler/bridge-runtime-telemetry.js';

export function createBridgeTelemetryController({ projectPath, log }) {
  let bridgeTelemetry = readBridgeRuntimeTelemetry(projectPath) || null;

  function persistBridgeTelemetry(patch = {}) {
    bridgeTelemetry = {
      ...(bridgeTelemetry || {}),
      projectPath,
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
