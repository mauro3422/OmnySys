import { describe, it, expect } from 'vitest';
import { detectMonitorPattern } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/monitor-pattern.js';

describe('race-detector/.../detectors/monitor-pattern.js', () => {
  it('detects monitor/synchronized style protection', () => {
    const lock = detectMonitorPattern('synchronized(this) { mutate(); }', { name: 'state', line: 2, column: 3 });
    expect(lock).toMatchObject({ type: 'monitor', scope: 'block', target: 'state' });
  });

  it('returns null when monitor pattern is absent', () => {
    expect(detectMonitorPattern('const data = read();', { line: 1 })).toBe(null);
  });
});

