/**
 * @fileoverview Tests for function-cycle-classifier.js (legacy compatibility) - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import * as legacy from '#layer-a/analyses/tier1/function-cycle-classifier.js';
import * as modern from '#layer-a/analyses/tier1/function-cycle-classifier/index.js';

// Contract-based test suite for compatibility layer
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/function-cycle-classifier',
  exports: { 
    classifyFunctionCycle: legacy.classifyFunctionCycle,
    classifyAllFunctionCycles: legacy.classifyAllFunctionCycles,
    FUNCTION_CYCLE_RULES: legacy.FUNCTION_CYCLE_RULES,
    extractFunctionMetadata: legacy.extractFunctionMetadata,
    default: legacy.default
  },
  specificTests: [
    {
      name: 're-exports compatibility API from modular entrypoint',
      test: () => {
        expect(legacy.classifyFunctionCycle).toBe(modern.classifyFunctionCycle);
        expect(legacy.classifyAllFunctionCycles).toBe(modern.classifyAllFunctionCycles);
        expect(legacy.FUNCTION_CYCLE_RULES).toBe(modern.FUNCTION_CYCLE_RULES);
        expect(legacy.extractFunctionMetadata).toBe(modern.extractFunctionMetadata);
      }
    },
    {
      name: 'keeps default export mapped to modular default',
      test: () => {
        expect(legacy.default).toEqual(modern.default);
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier.js (legacy compatibility)', suite);
