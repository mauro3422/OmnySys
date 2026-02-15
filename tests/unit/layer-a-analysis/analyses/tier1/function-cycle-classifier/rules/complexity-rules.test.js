/**
 * @fileoverview Tests for function-cycle-classifier/rules/complexity-rules.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import {
  initializationCoordinationRule,
  highComplexityDeepCycleRule
} from '#layer-a/analyses/tier1/function-cycle-classifier/rules/complexity-rules.js';

// Contract-based test suite
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/function-cycle-classifier/rules/complexity-rules',
  exports: { initializationCoordinationRule, highComplexityDeepCycleRule },
  specificTests: [
    {
      name: 'detects initialization coordination in short cycles',
      test: () => {
        const cycle = ['a::initStore', 'a::run'];
        const metadata = {
          'a::initStore': { name: 'initStore', temporal: {} },
          'a::run': { name: 'run', temporal: {} }
        };
        expect(initializationCoordinationRule.condition(cycle, metadata)).toBe(true);
      }
    },
    {
      name: 'detects high complexity deep cycles',
      test: () => {
        const cycle = ['a::f1', 'a::f2', 'a::f3', 'a::f4'];
        const metadata = {
          'a::f1': { complexity: 12 },
          'a::f2': { complexity: 14 },
          'a::f3': { complexity: 2 },
          'a::f4': { complexity: 1 }
        };
        expect(highComplexityDeepCycleRule.condition(cycle, metadata)).toBe(true);
      }
    },
    {
      name: 'rules have required properties',
      test: () => {
        for (const rule of [initializationCoordinationRule, highComplexityDeepCycleRule]) {
          expect(rule).toHaveProperty('id');
          expect(rule).toHaveProperty('condition');
          expect(typeof rule.condition).toBe('function');
        }
      }
    },
    {
      name: 'conditions return boolean values',
      test: () => {
        const cycle = ['a::x'];
        const metadata = { 'a::x': {} };
        
        const result1 = initializationCoordinationRule.condition(cycle, metadata);
        const result2 = highComplexityDeepCycleRule.condition(cycle, metadata);
        
        expect(typeof result1).toBe('boolean');
        expect(typeof result2).toBe('boolean');
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier/rules/complexity-rules.js', suite);
