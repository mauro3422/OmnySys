import { describe, it, expect } from 'vitest';
import { findPotentialDeadlocks } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/deadlock.js';

describe('race-detector/.../analysis/deadlock.js', () => {
  it('detects opposite lock ordering as potential deadlock', () => {
    const deadlocks = findPotentialDeadlocks([
      { atom: 'a1', locks: ['L1', 'L2'] },
      { atom: 'a2', locks: ['L2', 'L1'] }
    ]);

    expect(deadlocks.length).toBeGreaterThanOrEqual(1);
    expect(deadlocks[0].type).toBe('potential_deadlock');
  });

  it('returns empty list for non-circular lock orders', () => {
    expect(findPotentialDeadlocks([{ atom: 'a1', locks: ['L1', 'L2'] }])).toEqual([]);
  });
});

