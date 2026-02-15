import { describe, it, expect } from 'vitest';
import { determineScope } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/utils/scope.js';

describe('race-detector/.../analyzers/lock/utils/scope.js', () => {
  it('determines scope from lock context hints', () => {
    expect(determineScope('m', 'static mutex lock')).toBe('global');
    expect(determineScope('m', 'this.lock.acquire()')).toBe('instance');
    expect(determineScope('m', 'const lock = new Mutex()')).toBe('local');
  });
});

