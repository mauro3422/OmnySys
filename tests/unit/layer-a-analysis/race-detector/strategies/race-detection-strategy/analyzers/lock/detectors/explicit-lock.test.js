import { describe, it, expect } from 'vitest';
import { detectExplicitLock } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/explicit-lock.js';

describe('race-detector/.../detectors/explicit-lock.js', () => {
  it('detects explicit lock patterns and release semantics', () => {
    const lock = detectExplicitLock(
      'await mutex.lock(); write(); mutex.unlock();',
      { name: 'counter', line: 10, column: 2 },
      () => 'instance'
    );
    expect(lock).toMatchObject({
      type: 'explicit',
      target: 'counter',
      scope: 'instance',
      lockName: 'mutex',
      hasRelease: true
    });
  });

  it('returns null when no explicit lock is found', () => {
    expect(detectExplicitLock('const x = 1;', { line: 1 }, () => 'local')).toBe(null);
  });
});

