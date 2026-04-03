/**
 * @fileoverview Canonical proxy runtime telemetry helpers.
 *
 * Persists and summarizes restart/crash signals from the MCP HTTP proxy so
 * status/health consumers can detect thrashing without reading logs.
 */

import fs from 'fs';
import path from 'path';

import { ensureCompilerRuntimeDirSync } from './runtime-ownership.js';
import { asNumber } from './core-utils.js';

export function getProxyRuntimeTelemetryPath(projectRoot) {
  if (!projectRoot) {
    return null;
  }

  return path.join(ensureCompilerRuntimeDirSync(projectRoot), 'proxy-runtime-telemetry.json');
}

export function readProxyRuntimeTelemetry(projectRoot) {
  try {
    const telemetryPath = getProxyRuntimeTelemetryPath(projectRoot);
    if (!telemetryPath || !fs.existsSync(telemetryPath)) {
      return null;
    }

    const raw = fs.readFileSync(telemetryPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeProxyRuntimeTelemetrySync(projectRoot, telemetry = null) {
  const telemetryPath = getProxyRuntimeTelemetryPath(projectRoot);
  if (!telemetryPath) {
    return null;
  }

  fs.writeFileSync(telemetryPath, JSON.stringify(telemetry || {}, null, 2));
  return telemetryPath;
}

function countRecentEvents(events = [], eventType, windowMs = 10 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  return events.filter((event) => {
    if (!event || event.type !== eventType) return false;
    const atMs = Date.parse(event.at || '');
    return Number.isFinite(atMs) && atMs >= cutoff;
  }).length;
}

export function summarizeProxyRuntimeTelemetry(telemetry = null) {
  if (!telemetry || typeof telemetry !== 'object') {
    return {
      state: 'missing',
      summary: 'Proxy runtime telemetry unavailable.',
      recommendation: 'Persist proxy runtime telemetry so restart/crash patterns can be tracked.',
      restartCount: 0,
      crashCount: 0,
      unexpectedExitCount: 0,
      cleanExitCount: 0,
      events: []
    };
  }

  const events = Array.isArray(telemetry.events) ? telemetry.events.slice(-20) : [];
  const restartCount = asNumber(telemetry.restartCount, 0);
  const crashCount = asNumber(telemetry.crashCount, 0);
  const unexpectedExitCount = asNumber(telemetry.unexpectedExitCount, 0);
  const cleanExitCount = asNumber(telemetry.cleanExitCount, 0);
  const recentRestartCount = countRecentEvents(events, 'restart-requested');
  const recentCrashCount = countRecentEvents(events, 'worker-crash');
  const recentUnexpectedExitCount = countRecentEvents(events, 'worker-exit-unexpected');

  const state = recentCrashCount > 0 || crashCount > 1 || unexpectedExitCount > 1
    ? 'thrashing'
    : recentCrashCount > 0 || recentRestartCount > 2 || recentUnexpectedExitCount > 0
      ? 'watchful'
      : cleanExitCount > 0 && restartCount === 0
        ? 'stable'
        : 'watchful';

  const lastEvent = events[events.length - 1] || null;
  const lastEventAgeMs = lastEvent?.at ? Math.max(0, Date.now() - Date.parse(lastEvent.at)) : null;

  return {
    projectPath: telemetry.projectPath || null,
    port: telemetry.port || null,
    pid: telemetry.pid || null,
    state,
    summary: `${state} | restarts=${restartCount} | crashes=${crashCount} | exits=${unexpectedExitCount} | clean=${cleanExitCount}${telemetry.workerPid ? ` | worker=${telemetry.workerPid}` : ''}`,
    recommendation: state === 'thrashing'
      ? 'Investigate rapid worker exits and restart loops before trusting bootstrap snapshots.'
      : 'Keep proxy restart telemetry persisted so regressions are visible in status.',
    restartCount,
    crashCount,
    unexpectedExitCount,
    cleanExitCount,
    recentRestartCount,
    recentCrashCount,
    recentUnexpectedExitCount,
    lastEventType: lastEvent?.type || null,
    lastEventAt: lastEvent?.at || null,
    lastEventAgeMs,
    workerPid: telemetry.workerPid || null,
    workerStartedAt: telemetry.workerStartedAt || null,
    workerExitAt: telemetry.workerExitAt || null,
    workerExitCode: telemetry.workerExitCode ?? null,
    workerExitSignal: telemetry.workerExitSignal ?? null,
    events
  };
}

export default {
  getProxyRuntimeTelemetryPath,
  readProxyRuntimeTelemetry,
  writeProxyRuntimeTelemetrySync,
  summarizeProxyRuntimeTelemetry
};
