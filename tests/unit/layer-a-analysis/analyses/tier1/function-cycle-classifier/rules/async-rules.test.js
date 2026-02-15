/**
 * @fileoverview Tests for function-cycle-classifier/rules/async-rules.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import {
  eventHandlerCycleRule,
  asyncPromiseChainRule,
  asyncCycleNoErrorHandlingRule
} from '#layer-a/analyses/tier1/function-cycle-classifier/rules/async-rules.js';

// Contract-based test suite
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/function-cycle-classifier/rules/async-rules',
  exports: { eventHandlerCycleRule, asyncPromiseChainRule, asyncCycleNoErrorHandlingRule },
  specificTests: [
    {
      name: 'matches event handler cycle rule on event/lifecycle patterns',
      test: () => {
        const cycle = ['a::fn'];
        const metadata = {
          'a::fn': { temporal: { eventSetup: ['click'] }, calls: [], hasLifecycleHooks: false }
        };
        expect(eventHandlerCycleRule.condition(cycle, metadata)).toBe(true);
      }
    },
    {
      name: 'matches async promise-chain rule for async functions with promise chains',
      test: () => {
        const cycle = ['a::fn'];
        const metadata = {
          'a::fn': { isAsync: true, temporal: { asyncPatterns: { hasPromiseChain: true } } }
        };
        expect(asyncPromiseChainRule.condition(cycle, metadata)).toBe(true);
      }
    },
    {
      name: 'flags async cycles without error handling as critical condition',
      test: () => {
        const cycle = ['a::x', 'a::y', 'a::z'];
        const metadata = {
          'a::x': { isAsync: true, hasErrorHandling: false },
          'a::y': { isAsync: true, hasErrorHandling: false },
          'a::z': { isAsync: true, hasErrorHandling: false }
        };
        expect(asyncCycleNoErrorHandlingRule.condition(cycle, metadata)).toBe(true);
      }
    },
    {
      name: 'rules have required properties',
      test: () => {
        for (const rule of [eventHandlerCycleRule, asyncPromiseChainRule, asyncCycleNoErrorHandlingRule]) {
          expect(rule).toHaveProperty('id');
          expect(rule).toHaveProperty('condition');
          expect(typeof rule.condition).toBe('function');
        }
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier/rules/async-rules.js', suite);
