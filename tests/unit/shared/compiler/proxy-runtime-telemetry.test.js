import { describe, expect, it } from 'vitest';

import { summarizeProxyRuntimeTelemetry } from '../../../../src/shared/compiler/proxy-runtime-telemetry.js';

describe('proxy runtime telemetry', () => {
  it('summarizes a stable proxy as watchful/stable when there are no crash loops', () => {
    const summary = summarizeProxyRuntimeTelemetry({
      projectPath: 'C:/Dev/OmnySystem',
      port: 9999,
      pid: 1234,
      restartCount: 0,
      crashCount: 0,
      unexpectedExitCount: 0,
      cleanExitCount: 1,
      events: [
        { type: 'spawn-initial', at: '2026-04-03T22:00:00.000Z' },
        { type: 'worker-exit-clean', at: '2026-04-03T22:00:05.000Z' }
      ]
    });

    expect(summary).toMatchObject({
      state: 'stable',
      restartCount: 0,
      crashCount: 0,
      cleanExitCount: 1
    });
    expect(summary.summary).toContain('restarts=0');
    expect(summary.summary).toContain('crashes=0');
  });

  it('flags recent crash loops as thrashing', () => {
    const summary = summarizeProxyRuntimeTelemetry({
      restartCount: 4,
      crashCount: 2,
      unexpectedExitCount: 2,
      cleanExitCount: 0,
      events: [
        { type: 'worker-crash', at: new Date(Date.now() - 1000).toISOString() },
        { type: 'restart-requested', at: new Date(Date.now() - 900).toISOString() },
        { type: 'worker-crash', at: new Date(Date.now() - 800).toISOString() }
      ]
    });

    expect(summary.state).toBe('thrashing');
    expect(summary.recentCrashCount).toBeGreaterThan(0);
    expect(summary.summary).toContain('crashes=2');
  });
});
