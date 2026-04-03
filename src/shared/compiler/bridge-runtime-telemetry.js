/**
 * @fileoverview Canonical MCP stdio bridge runtime telemetry helpers.
 */

import fs from 'fs';
import path from 'path';

import { ensureCompilerRuntimeDirSync } from './runtime-ownership.js';
import { asNumber } from './core-utils.js';

export function getBridgeRuntimeTelemetryPath(projectRoot) {
  if (!projectRoot) return null;
  return path.join(ensureCompilerRuntimeDirSync(projectRoot), 'bridge-runtime-telemetry.json');
}

export function readBridgeRuntimeTelemetry(projectRoot) {
  try {
    const telemetryPath = getBridgeRuntimeTelemetryPath(projectRoot);
    if (!telemetryPath || !fs.existsSync(telemetryPath)) return null;
    const raw = fs.readFileSync(telemetryPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeBridgeRuntimeTelemetrySync(projectRoot, telemetry = null) {
  const telemetryPath = getBridgeRuntimeTelemetryPath(projectRoot);
  if (!telemetryPath) return null;
  fs.writeFileSync(telemetryPath, JSON.stringify(telemetry || {}, null, 2));
  return telemetryPath;
}

function countRecent(events = [], eventType, windowMs = 10 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  return events.filter((event) => {
    if (!event || event.type !== eventType) return false;
    const atMs = Date.parse(event.at || '');
    return Number.isFinite(atMs) && atMs >= cutoff;
  }).length;
}

export function summarizeBridgeRuntimeTelemetry(telemetry = null) {
  if (!telemetry || typeof telemetry !== 'object') {
    return {
      state: 'missing',
      summary: 'Bridge runtime telemetry unavailable.',
      recommendation: 'Persist bridge recovery telemetry to detect client transport drops.',
      connectCount: 0,
      reconnectCount: 0,
      transportClosedCount: 0,
      sessionExpiredCount: 0,
      retryableErrorCount: 0,
      stdioCloseCount: 0,
      events: []
    };
  }

  const events = Array.isArray(telemetry.events) ? telemetry.events.slice(-30) : [];
  const connectCount = asNumber(telemetry.connectCount, 0);
  const reconnectCount = asNumber(telemetry.reconnectCount, 0);
  const transportClosedCount = asNumber(telemetry.transportClosedCount, 0);
  const sessionExpiredCount = asNumber(telemetry.sessionExpiredCount, 0);
  const retryableErrorCount = asNumber(telemetry.retryableErrorCount, 0);
  const stdioCloseCount = asNumber(telemetry.stdioCloseCount, 0);
  const recentTransportClosed = countRecent(events, 'transport-closed');
  const recentSessionExpired = countRecent(events, 'session-expired');
  const recentReconnects = countRecent(events, 'bridge-reconnect') + countRecent(events, 'bridge-recovery-needed');
  const recentRecoverySignals = recentTransportClosed + recentSessionExpired + recentReconnects;

  const state = recentRecoverySignals >= 3
    ? 'thrashing'
    : recentRecoverySignals > 0
      ? 'watchful'
      : connectCount > 0
        ? 'stable'
        : 'missing';

  const lastEvent = events[events.length - 1] || null;
  return {
    projectPath: telemetry.projectPath || null,
    state,
    summary: `${state} | connects=${connectCount} | reconnects=${reconnectCount} | closed=${transportClosedCount} | expired=${sessionExpiredCount} | retryable=${retryableErrorCount} | stdioClose=${stdioCloseCount}`,
    recommendation: state === 'watchful'
      ? 'Review bridge recovery, session expiry, and transport-close patterns before trusting the client UI.'
      : 'Keep bridge runtime telemetry persisted so client disconnects are visible in status.',
    connectCount,
    reconnectCount,
    transportClosedCount,
    sessionExpiredCount,
    retryableErrorCount,
    stdioCloseCount,
    recentTransportClosed,
    recentSessionExpired,
    recentReconnects,
    recentRecoverySignals,
    lastEventType: lastEvent?.type || null,
    lastEventAt: lastEvent?.at || null,
    lastEventAgeMs: lastEvent?.at ? Math.max(0, Date.now() - Date.parse(lastEvent.at)) : null,
    events
  };
}

export default {
  getBridgeRuntimeTelemetryPath,
  readBridgeRuntimeTelemetry,
  writeBridgeRuntimeTelemetrySync,
  summarizeBridgeRuntimeTelemetry
};
