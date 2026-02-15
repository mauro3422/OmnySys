/**
 * @fileoverview Tests for function-cycle-classifier/rules/index.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import {
  FUNCTION_CYCLE_RULES,
  directRecursionRule,
  pureMutualRecursionRule,
  mutualRecursionWithSideEffectsRule,
  eventHandlerCycleRule,
  asyncPromiseChainRule,
  asyncCycleNoErrorHandlingRule,
  initializationCoordinationRule,
  highComplexityDeepCycleRule
} from '#layer-a/analyses/tier1/function-cycle-classifier/rules/index.js';

// Contract-based test suite
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/function-cycle-classifier/rules/index',
  exports: { 
    FUNCTION_CYCLE_RULES,
    directRecursionRule,
    pureMutualRecursionRule,
    mutualRecursionWithSideEffectsRule,
    eventHandlerCycleRule,
    asyncPromiseChainRule,
    asyncCycleNoErrorHandlingRule,
    initializationCoordinationRule,
    highComplexityDeepCycleRule
  },
  specificTests: [
    {
      name: 'exports consolidated rule list and named rules',
      test: () => {
        expect(FUNCTION_CYCLE_RULES.length).toBe(8);
        expect(FUNCTION_CYCLE_RULES).toContain(directRecursionRule);
        expect(FUNCTION_CYCLE_RULES).toContain(pureMutualRecursionRule);
        expect(FUNCTION_CYCLE_RULES).toContain(mutualRecursionWithSideEffectsRule);
        expect(FUNCTION_CYCLE_RULES).toContain(eventHandlerCycleRule);
        expect(FUNCTION_CYCLE_RULES).toContain(asyncPromiseChainRule);
        expect(FUNCTION_CYCLE_RULES).toContain(asyncCycleNoErrorHandlingRule);
        expect(FUNCTION_CYCLE_RULES).toContain(initializationCoordinationRule);
        expect(FUNCTION_CYCLE_RULES).toContain(highComplexityDeepCycleRule);
      }
    },
    {
      name: 'all rules have required properties',
      test: () => {
        for (const rule of FUNCTION_CYCLE_RULES) {
          expect(rule).toHaveProperty('id');
          expect(rule).toHaveProperty('condition');
          expect(typeof rule.condition).toBe('function');
        }
      }
    },
    {
      name: 'all rules have unique ids',
      test: () => {
        const ids = FUNCTION_CYCLE_RULES.map(r => r.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    },
    {
      name: 'named exports match rules in array',
      test: () => {
        const namedRules = [
          directRecursionRule,
          pureMutualRecursionRule,
          mutualRecursionWithSideEffectsRule,
          eventHandlerCycleRule,
          asyncPromiseChainRule,
          asyncCycleNoErrorHandlingRule,
          initializationCoordinationRule,
          highComplexityDeepCycleRule
        ];
        
        for (const rule of namedRules) {
          expect(FUNCTION_CYCLE_RULES).toContain(rule);
        }
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier/rules/index.js', suite);
