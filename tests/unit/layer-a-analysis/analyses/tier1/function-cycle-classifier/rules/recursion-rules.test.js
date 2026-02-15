import { describe, it, expect } from 'vitest';
import {
  directRecursionRule,
  pureMutualRecursionRule,
  mutualRecursionWithSideEffectsRule
} from '#layer-a/analyses/tier1/function-cycle-classifier/rules/recursion-rules.js';

describe('analyses/tier1/function-cycle-classifier/rules/recursion-rules.js', () => {
  it('detects direct recursion pattern A -> A', () => {
    expect(directRecursionRule.condition(['a::fn', 'a::fn'], {})).toBe(true);
  });

  it('detects pure mutual recursion A -> B -> A', () => {
    const cycle = ['a::fa', 'a::fb', 'a::fa'];
    const metadata = {
      'a::fa': { hasSideEffects: false, hasNetworkCalls: false, complexity: 2 },
      'a::fb': { hasSideEffects: false, hasNetworkCalls: false, complexity: 3 }
    };
    expect(pureMutualRecursionRule.condition(cycle, metadata)).toBe(true);
  });

  it('detects mutual recursion with side effects', () => {
    const cycle = ['a::fa', 'a::fb', 'a::fa'];
    const metadata = {
      'a::fa': { hasSideEffects: true },
      'a::fb': { hasSideEffects: false }
    };
    expect(mutualRecursionWithSideEffectsRule.condition(cycle, metadata)).toBe(true);
  });
});

