/**
 * @fileoverview Tests for function-cycle-classifier/classifiers/rules.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { FUNCTION_CYCLE_RULES } from '#layer-a/analyses/tier1/function-cycle-classifier/classifiers/rules.js';

// Contract-based test suite
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/function-cycle-classifier/classifiers/rules',
  exports: { FUNCTION_CYCLE_RULES },
  specificTests: [
    {
      name: 'exports non-empty rule set with required rule fields',
      test: () => {
        expect(Array.isArray(FUNCTION_CYCLE_RULES)).toBe(true);
        expect(FUNCTION_CYCLE_RULES.length).toBeGreaterThan(0);
        for (const rule of FUNCTION_CYCLE_RULES) {
          expect(rule).toHaveProperty('id');
          expect(rule).toHaveProperty('condition');
          expect(typeof rule.condition).toBe('function');
        }
      }
    },
    {
      name: 'each rule has a unique id',
      test: () => {
        const ids = FUNCTION_CYCLE_RULES.map(r => r.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    },
    {
      name: 'each rule condition returns boolean',
      test: () => {
        for (const rule of FUNCTION_CYCLE_RULES) {
          const result = rule.condition([], {});
          expect(typeof result).toBe('boolean');
        }
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier/classifiers/rules.js', suite);
