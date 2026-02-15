import { describe, it, expect } from 'vitest';
import * as analysis from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/index.js';

describe('race-detector/.../analysis/index.js', () => {
  it('re-exports lock analysis helpers', () => {
    expect(analysis.analyzeLockCoverage).toBeTypeOf('function');
    expect(analysis.findPotentialDeadlocks).toBeTypeOf('function');
    expect(analysis.checkMitigation).toBeTypeOf('function');
  });
});

