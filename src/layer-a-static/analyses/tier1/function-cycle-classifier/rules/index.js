/**
 * @fileoverview Rules Index
 * 
 * @module function-cycle-classifier/rules
 */

import { directRecursionRule, pureMutualRecursionRule, mutualRecursionWithSideEffectsRule } from './recursion-rules.js';
import { eventHandlerCycleRule, asyncPromiseChainRule, asyncCycleNoErrorHandlingRule } from './async-rules.js';
import { initializationCoordinationRule, highComplexityDeepCycleRule } from './complexity-rules.js';

/**
 * All classification rules
 */
export const FUNCTION_CYCLE_RULES = [
  directRecursionRule,
  pureMutualRecursionRule,
  eventHandlerCycleRule,
  asyncPromiseChainRule,
  initializationCoordinationRule,
  mutualRecursionWithSideEffectsRule,
  asyncCycleNoErrorHandlingRule,
  highComplexityDeepCycleRule
];

export {
  directRecursionRule,
  pureMutualRecursionRule,
  mutualRecursionWithSideEffectsRule,
  eventHandlerCycleRule,
  asyncPromiseChainRule,
  asyncCycleNoErrorHandlingRule,
  initializationCoordinationRule,
  highComplexityDeepCycleRule
};
