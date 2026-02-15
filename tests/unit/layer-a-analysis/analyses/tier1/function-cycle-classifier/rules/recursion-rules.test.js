/**
 * @fileoverview Tests for function-cycle-classifier/rules/recursion-rules.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import {
  directRecursionRule,
  pureMutualRecursionRule,
  mutualRecursionWithSideEffectsRule
} from '#layer-a/analyses/tier1/function-cycle-classifier/rules/recursion-rules.js';

// Contract-based test suite
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/function-cycle-classifier/rules/recursion-rules',
  exports: { 
    directRecursionRule, 
    pureMutualRecursionRule, 
    mutualRecursionWithSideEffectsRule 
  },
  specificTests: [
    {
      name: 'detects direct recursion pattern A -> A',
      test: () => {
        expect(directRecursionRule.condition(['a::fn', 'a::fn'], {})).toBe(true);
      }
    },
    {
      name: 'detects pure mutual recursion A -> B -> A',
      test: () => {
        const cycle = ['a::fa', 'a::fb', 'a::fa'];
        const metadata = {
          'a::fa': { hasSideEffects: false, hasNetworkCalls: false, complexity: 2 },
          'a::fb': { hasSideEffects: false, hasNetworkCalls: false, complexity: 3 }
        };
        expect(pureMutualRecursionRule.condition(cycle, metadata)).toBe(true);
      }
    },
    {
      name: 'detects mutual recursion with side effects',
      test: () => {
        const cycle = ['a::fa', 'a::fb', 'a::fa'];
        const metadata = {
          'a::fa': { hasSideEffects: true },
          'a::fb': { hasSideEffects: false }
        };
        expect(mutualRecursionWithSideEffectsRule.condition(cycle, metadata)).toBe(true);
      }
    },
    {
      name: 'rules have required properties',
      test: () => {
        for (const rule of [directRecursionRule, pureMutualRecursionRule, mutualRecursionWithSideEffectsRule]) {
          expect(rule).toHaveProperty('id');
          expect(rule).toHaveProperty('condition');
          expect(typeof rule.condition).toBe('function');
        }
      }
    },
    {
      name: 'direct recursion returns false for non-recursive cycles',
      test: () => {
        expect(directRecursionRule.condition(['a::fn', 'b::fn'], {})).toBe(false);
        expect(directRecursionRule.condition(['a::fn'], {})).toBe(false);
      }
    },
    {
      name: 'pure mutual recursion returns false for impure cycles',
      test: () => {
        const cycle = ['a::fa', 'a::fb', 'a::fa'];
        const metadata = {
          'a::fa': { hasSideEffects: true, hasNetworkCalls: false, complexity: 2 },
          'a::fb': { hasSideEffects: false, hasNetworkCalls: false, complexity: 3 }
        };
        expect(pureMutualRecursionRule.condition(cycle, metadata)).toBe(false);
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier/rules/recursion-rules.js', suite);
