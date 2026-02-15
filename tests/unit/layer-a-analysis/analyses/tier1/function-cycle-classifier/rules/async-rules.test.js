import { describe, it, expect } from 'vitest';
import {
  eventHandlerCycleRule,
  asyncPromiseChainRule,
  asyncCycleNoErrorHandlingRule
} from '#layer-a/analyses/tier1/function-cycle-classifier/rules/async-rules.js';

describe('analyses/tier1/function-cycle-classifier/rules/async-rules.js', () => {
  it('matches event handler cycle rule on event/lifecycle patterns', () => {
    const cycle = ['a::fn'];
    const metadata = {
      'a::fn': { temporal: { eventSetup: ['click'] }, calls: [], hasLifecycleHooks: false }
    };
    expect(eventHandlerCycleRule.condition(cycle, metadata)).toBe(true);
  });

  it('matches async promise-chain rule for async functions with promise chains', () => {
    const cycle = ['a::fn'];
    const metadata = {
      'a::fn': { isAsync: true, temporal: { asyncPatterns: { hasPromiseChain: true } } }
    };
    expect(asyncPromiseChainRule.condition(cycle, metadata)).toBe(true);
  });

  it('flags async cycles without error handling as critical condition', () => {
    const cycle = ['a::x', 'a::y', 'a::z'];
    const metadata = {
      'a::x': { isAsync: true, hasErrorHandling: false },
      'a::y': { isAsync: true, hasErrorHandling: false },
      'a::z': { isAsync: true, hasErrorHandling: false }
    };
    expect(asyncCycleNoErrorHandlingRule.condition(cycle, metadata)).toBe(true);
  });
});

