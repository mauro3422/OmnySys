import { describe, it, expect } from 'vitest';
import { calculateSideEffectScore } from '#layer-a/analyses/tier3/factors/SideEffectScore.js';

describe('analyses/tier3/factors/SideEffectScore.js', () => {
  it('assigns side-effect score with critical combinations', () => {
    expect(calculateSideEffectScore({ makesNetworkCalls: true, modifiesGlobalState: true }).score).toBe(3);
    expect(calculateSideEffectScore({ hasGlobalAccess: true }).score).toBe(1);
  });
});

