import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  readBridgeRuntimeTelemetry,
  summarizeBridgeRuntimeTelemetry,
  writeBridgeRuntimeTelemetrySync
} from '../../../../src/shared/compiler/bridge-runtime-telemetry.js';

describe('bridge runtime telemetry', () => {
  it('summarizes missing telemetry as missing', () => {
    const summary = summarizeBridgeRuntimeTelemetry(null);

    expect(summary).toMatchObject({
      state: 'missing',
      connectCount: 0,
      reconnectCount: 0,
      transportClosedCount: 0,
      sessionExpiredCount: 0,
      retryableErrorCount: 0,
      stdioCloseCount: 0
    });
  });

  it('roundtrips telemetry to disk and surfaces reconnect signals', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'omnysys-bridge-'));
    const telemetry = {
      projectPath: projectRoot,
      connectCount: 1,
      reconnectCount: 2,
      transportClosedCount: 1,
      sessionExpiredCount: 1,
      retryableErrorCount: 1,
      stdioCloseCount: 0,
      events: [
        { type: 'bridge-connect', at: new Date().toISOString() },
        { type: 'transport-closed', at: new Date().toISOString() },
        { type: 'bridge-recovery-needed', at: new Date().toISOString() },
        { type: 'bridge-reconnect', at: new Date().toISOString() }
      ]
    };

    const writtenPath = writeBridgeRuntimeTelemetrySync(projectRoot, telemetry);
    const readBack = readBridgeRuntimeTelemetry(projectRoot);
    const summary = summarizeBridgeRuntimeTelemetry(readBack);

    expect(fs.existsSync(writtenPath)).toBe(true);
    expect(readBack).toMatchObject({
      connectCount: 1,
      reconnectCount: 2,
      transportClosedCount: 1,
      sessionExpiredCount: 1,
      retryableErrorCount: 1
    });
    expect(summary).toMatchObject({
      state: 'thrashing',
      riskLevel: 'critical',
      connectCount: 1,
      reconnectCount: 2,
      transportClosedCount: 1,
      sessionExpiredCount: 1,
      retryableErrorCount: 1
    });
    expect(summary.summary).toContain('connects=1');
    expect(summary.summary).toContain('reconnects=2');
    expect(summary.summary).toContain('risk=critical');
    expect(summary.warningSignals).toContain('recovery-thrashing');
  });

  it('flags zero-session daemon health as a bridge risk when session state still exists', () => {
    const summary = summarizeBridgeRuntimeTelemetry({
      projectPath: '/tmp/omnysys-bridge',
      connectCount: 1,
      reconnectCount: 0,
      transportClosedCount: 0,
      sessionExpiredCount: 0,
      retryableErrorCount: 0,
      stdioCloseCount: 0,
      lastSessionId: 'session-live',
      lastDaemonHealth: {
        reachable: true,
        healthy: true,
        status: 'healthy',
        initialized: true,
        sessions: 0,
        service: 'omnysys-mcp-http',
        transport: 'streamable-http'
      },
      events: [
        {
          type: 'bridge-connect',
          at: new Date().toISOString()
        }
      ]
    });

    expect(summary.state).toBe('stable');
    expect(summary.riskLevel).toBe('high');
    expect(summary.warningReasons.join(' ')).toContain('zero active sessions');
    expect(summary.summary).toContain('risk=high');
  });
});
