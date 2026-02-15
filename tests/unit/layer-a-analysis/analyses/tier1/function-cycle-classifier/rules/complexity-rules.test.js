import { describe, it, expect } from 'vitest';
import {
  initializationCoordinationRule,
  highComplexityDeepCycleRule
} from '#layer-a/analyses/tier1/function-cycle-classifier/rules/complexity-rules.js';

describe('analyses/tier1/function-cycle-classifier/rules/complexity-rules.js', () => {
  it('detects initialization coordination in short cycles', () => {
    const cycle = ['a::initStore', 'a::run'];
    const metadata = {
      'a::initStore': { name: 'initStore', temporal: {} },
      'a::run': { name: 'run', temporal: {} }
    };
    expect(initializationCoordinationRule.condition(cycle, metadata)).toBe(true);
  });

  it('detects high complexity deep cycles', () => {
    const cycle = ['a::f1', 'a::f2', 'a::f3', 'a::f4'];
    const metadata = {
      'a::f1': { complexity: 12 },
      'a::f2': { complexity: 14 },
      'a::f3': { complexity: 2 },
      'a::f4': { complexity: 1 }
    };
    expect(highComplexityDeepCycleRule.condition(cycle, metadata)).toBe(true);
  });
});

