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

function compactDaemonHealth(health = null) {
  if (!health || typeof health !== 'object') {
    return null;
  }

  return {
    reachable: health.reachable === true,
    healthy: health.healthy === true,
    status: health.status || null,
    initialized: health.initialized === true,
    pid: Number.isFinite(Number(health.pid)) ? Number(health.pid) : null,
    sessions: asNumber(health.sessions, 0),
    service: health.service || null,
    transport: health.transport || null,
    error: health.error || null
  };
}

function pushUnique(list, value) {
  if (!value || list.includes(value)) {
    return;
  }
  list.push(value);
}

function deriveBridgeRiskSummary({
  state,
  connectCount,
  recentRecoverySignals,
  transportClosedCount,
  sessionExpiredCount,
  retryableErrorCount,
  stdioCloseCount,
  lastSessionId,
  bridgeTransportState,
  lastDaemonHealth,
  lastEventType
}) {
  const warningReasons = [];
  const warningSignals = [];
  const daemonHealth = compactDaemonHealth(lastDaemonHealth);

  if (state === 'thrashing') {
    pushUnique(warningReasons, 'Bridge recovery is thrashing between reconnect attempts.');
    pushUnique(warningSignals, 'recovery-thrashing');
  }

  if (recentRecoverySignals > 0) {
    pushUnique(warningSignals, 'recovery-signals');
  }

  if (transportClosedCount > 0) {
    pushUnique(warningReasons, `${transportClosedCount} transport closure(s) were observed.`);
    pushUnique(warningSignals, 'transport-closed');
  }

  if (sessionExpiredCount > 0) {
    pushUnique(warningReasons, `${sessionExpiredCount} session expiration(s) were observed.`);
    pushUnique(warningSignals, 'session-expired');
  }

  if (retryableErrorCount > 0) {
    pushUnique(warningReasons, `${retryableErrorCount} retryable bridge error(s) were observed.`);
    pushUnique(warningSignals, 'retryable-error');
  }

  if (stdioCloseCount > 0) {
    pushUnique(warningReasons, `${stdioCloseCount} stdio close event(s) were observed.`);
    pushUnique(warningSignals, 'stdio-close');
  }

  if (bridgeTransportState && ['recovering', 'session-expired', 'closed'].includes(bridgeTransportState)) {
    pushUnique(warningReasons, `Bridge transport state is ${bridgeTransportState}.`);
    pushUnique(warningSignals, bridgeTransportState);
  }

  if (lastEventType === 'bridge-http-error') {
    pushUnique(warningReasons, 'A recent HTTP transport error was recorded.');
    pushUnique(warningSignals, 'http-error');
  }

  if (daemonHealth && daemonHealth.healthy === false) {
    pushUnique(warningReasons, `Daemon health check reported ${daemonHealth.status || 'unhealthy'}.`);
    pushUnique(warningSignals, 'daemon-unhealthy');
  }

  if (daemonHealth && daemonHealth.healthy === true && daemonHealth.sessions === 0 && (connectCount > 0 || lastSessionId)) {
    pushUnique(warningReasons, 'Daemon reports zero active sessions while the bridge still has session state.');
    pushUnique(warningSignals, 'zero-daemon-sessions');
  }

  if (lastSessionId && !bridgeTransportState) {
    pushUnique(warningSignals, 'session-present');
  }

  let riskLevel = 'low';
  if (!Number.isFinite(connectCount) || connectCount <= 0) {
    riskLevel = daemonHealth ? 'medium' : 'unknown';
  }

  if (recentRecoverySignals >= 3 || sessionExpiredCount >= 2 || warningSignals.includes('recovery-thrashing')) {
    riskLevel = 'critical';
  } else if (
    warningReasons.length >= 3 ||
    warningSignals.includes('daemon-unhealthy') ||
    warningSignals.includes('zero-daemon-sessions') ||
    warningSignals.includes('http-error') ||
    warningSignals.includes('transport-closed') ||
    warningSignals.includes('session-expired') ||
    warningSignals.includes('stdio-close')
  ) {
    riskLevel = 'high';
  } else if (warningReasons.length > 0 || recentRecoverySignals > 0 || connectCount === 0) {
    riskLevel = 'medium';
  }

  const bridgeHealthState = state === 'missing' && connectCount === 0 && !daemonHealth
    ? 'idle'
    : state;

  return {
    bridgeHealthState,
    bridgeRiskLevel: riskLevel,
    bridgeWarningReasons: warningReasons,
    bridgeWarningSignals: warningSignals,
    daemonHealth
  };
}

export function summarizeBridgeRuntimeTelemetry(telemetry = null) {
  if (!telemetry || typeof telemetry !== 'object') {
    return {
      state: 'missing',
      healthState: 'missing',
      riskLevel: 'unknown',
      summary: 'Bridge runtime telemetry unavailable.',
      recommendation: 'Persist bridge recovery telemetry to detect client transport drops.',
      warningReasons: [],
      warningSignals: [],
      lastSessionId: null,
      bridgeTransportState: null,
      bridgeTransportGeneration: null,
      lastDaemonPid: null,
      lastDaemonHealth: null,
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
  const lastSessionId = telemetry.lastSessionId || telemetry.bridgeTransportSessionId || null;
  const bridgeTransportState = telemetry.bridgeTransportState || null;
  const bridgeTransportGeneration = asNumber(telemetry.bridgeTransportGeneration, null);
  const state = recentRecoverySignals >= 3
    ? 'thrashing'
    : recentRecoverySignals > 0
      ? 'watchful'
      : connectCount > 0
        ? 'stable'
        : 'missing';
  const health = deriveBridgeRiskSummary({
    state,
    connectCount,
    recentRecoverySignals,
    transportClosedCount,
    sessionExpiredCount,
    retryableErrorCount,
    stdioCloseCount,
    lastSessionId,
    bridgeTransportState,
    lastDaemonHealth: telemetry.lastDaemonHealth || telemetry.lastHealthCheck || telemetry.daemonHealth || null,
    lastEventType: events[events.length - 1]?.type || null
  });

  const lastEvent = events[events.length - 1] || null;
  return {
    projectPath: telemetry.projectPath || null,
    state,
    healthState: health.bridgeHealthState,
    riskLevel: health.bridgeRiskLevel,
    warningReasons: health.bridgeWarningReasons,
    warningSignals: health.bridgeWarningSignals,
    lastDaemonHealth: health.daemonHealth,
    lastDaemonHealthAt: telemetry.lastDaemonHealthAt || telemetry.lastHealthCheckAt || null,
    lastDaemonPid: health.daemonHealth?.pid ?? telemetry.lastDaemonPid ?? null,
    summary: `${state} | risk=${health.bridgeRiskLevel} | connects=${connectCount} | reconnects=${reconnectCount} | closed=${transportClosedCount} | expired=${sessionExpiredCount} | retryable=${retryableErrorCount} | stdioClose=${stdioCloseCount}${lastSessionId ? ` | session=${lastSessionId}` : ''}`,
    recommendation: health.bridgeRiskLevel === 'high' || health.bridgeRiskLevel === 'critical'
      ? 'Inspect bridge recovery and session reuse before trusting the client UI.'
      : state === 'watchful'
      ? 'Review bridge recovery, session expiry, and transport-close patterns before trusting the client UI.'
      : 'Keep bridge runtime telemetry persisted so client disconnects are visible in status.',
    lastSessionId,
    bridgeTransportState,
    bridgeTransportGeneration,
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
    bridgeHealthState: health.bridgeHealthState,
    bridgeRiskLevel: health.bridgeRiskLevel,
    bridgeWarningReasons: health.bridgeWarningReasons,
    bridgeWarningSignals: health.bridgeWarningSignals,
    events
  };
}

export function summarizeBridgeCallReliability(telemetry = null) {
  const summary = summarizeBridgeRuntimeTelemetry(telemetry);
  const failureCount = summary.transportClosedCount + summary.sessionExpiredCount + summary.retryableErrorCount;
  const attemptCount = summary.connectCount + summary.reconnectCount + failureCount;
  const failureRate = attemptCount > 0 ? failureCount / attemptCount : 0;
  const reliabilityState = failureCount >= 3
    ? 'thrashing'
    : failureCount > 0
      ? 'watching'
      : summary.state === 'missing'
        ? 'unknown'
        : 'stable';

  return {
    state: reliabilityState,
    failureCount,
    failureRate,
    attemptCount,
    retryableErrorCount: summary.retryableErrorCount,
    transportClosedCount: summary.transportClosedCount,
    sessionExpiredCount: summary.sessionExpiredCount,
    connectCount: summary.connectCount,
    reconnectCount: summary.reconnectCount,
    lastEventType: summary.lastEventType,
    lastEventAt: summary.lastEventAt,
    summary: failureCount > 0
      ? `${reliabilityState} | failures=${failureCount} | attempts=${attemptCount} | failureRate=${Math.round(failureRate * 100)}%`
      : `${reliabilityState} | failures=0 | attempts=${attemptCount}`,
    recommendation: failureCount > 0
      ? 'Track bridge closures, session expiry and retryable errors as a separate reliability surface.'
      : 'Keep persisting bridge telemetry so reliability regressions stay visible.'
  };
}

export default {
  getBridgeRuntimeTelemetryPath,
  readBridgeRuntimeTelemetry,
  writeBridgeRuntimeTelemetrySync,
  summarizeBridgeRuntimeTelemetry,
  summarizeBridgeCallReliability
};
