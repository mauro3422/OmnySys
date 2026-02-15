import { describe, it, expect } from 'vitest';
import { analyzeLockCoverage } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/coverage.js';

describe('race-detector/.../analysis/coverage.js', () => {
  it('computes lock coverage statistics', () => {
    const accesses = [{ atom: 'a1' }, { atom: 'a2' }];
    const result = analyzeLockCoverage(
      accesses,
      {},
      access => (access.atom === 'a1' ? { type: 'explicit' } : null),
      access => ({ id: access.atom })
    );

    expect(result).toMatchObject({ total: 2, protected: 1, unprotected: 1, coverageRatio: 0.5 });
  });
});

