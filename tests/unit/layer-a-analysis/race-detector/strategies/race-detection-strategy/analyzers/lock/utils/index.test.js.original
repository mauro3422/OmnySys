import { describe, it, expect } from 'vitest';
import { determineScope } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/utils/index.js';

describe('race-detector/.../analyzers/lock/utils/index.js', () => {
  it('re-exports determineScope', () => {
    expect(determineScope).toBeTypeOf('function');
    expect(determineScope('m', 'this.lock')).toBe('instance');
  });
});

