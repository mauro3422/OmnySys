import { describe, it, expect } from 'vitest';
import { FUNCTION_CYCLE_RULES } from '#layer-a/analyses/tier1/function-cycle-classifier/classifiers/rules.js';

describe('analyses/tier1/function-cycle-classifier/classifiers/rules.js', () => {
  it('exports non-empty rule set with required rule fields', () => {
    expect(Array.isArray(FUNCTION_CYCLE_RULES)).toBe(true);
    expect(FUNCTION_CYCLE_RULES.length).toBeGreaterThan(0);
    for (const rule of FUNCTION_CYCLE_RULES) {
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('condition');
      expect(typeof rule.condition).toBe('function');
    }
  });
});

