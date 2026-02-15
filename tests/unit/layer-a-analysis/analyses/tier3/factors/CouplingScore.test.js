import { describe, it, expect } from 'vitest';
import { calculateCouplingScore } from '#layer-a/analyses/tier3/factors/CouplingScore.js';

describe('analyses/tier3/factors/CouplingScore.js', () => {
  it('assigns coupling score from circular deps or coupled files', () => {
    expect(calculateCouplingScore({ problematicCycles: 1 }).score).toBe(1);
    expect(calculateCouplingScore({ coupledFiles: 3 }).score).toBe(1);
    expect(calculateCouplingScore({ coupledFiles: 0 }).score).toBe(0);
  });
});

