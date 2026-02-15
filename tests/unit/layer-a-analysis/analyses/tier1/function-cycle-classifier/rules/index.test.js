import { describe, it, expect } from 'vitest';
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

describe('analyses/tier1/function-cycle-classifier/rules/index.js', () => {
  it('exports consolidated rule list and named rules', () => {
    expect(FUNCTION_CYCLE_RULES.length).toBe(8);
    expect(FUNCTION_CYCLE_RULES).toContain(directRecursionRule);
    expect(FUNCTION_CYCLE_RULES).toContain(pureMutualRecursionRule);
    expect(FUNCTION_CYCLE_RULES).toContain(mutualRecursionWithSideEffectsRule);
    expect(FUNCTION_CYCLE_RULES).toContain(eventHandlerCycleRule);
    expect(FUNCTION_CYCLE_RULES).toContain(asyncPromiseChainRule);
    expect(FUNCTION_CYCLE_RULES).toContain(asyncCycleNoErrorHandlingRule);
    expect(FUNCTION_CYCLE_RULES).toContain(initializationCoordinationRule);
    expect(FUNCTION_CYCLE_RULES).toContain(highComplexityDeepCycleRule);
  });
});

