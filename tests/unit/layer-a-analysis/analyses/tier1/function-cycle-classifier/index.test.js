/**
 * @fileoverview Tests for function-cycle-classifier/index.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import {
  classifyFunctionCycle,
  classifyAllFunctionCycles
} from '#layer-a/analyses/tier1/function-cycle-classifier/index.js';

// Contract-based test suite
const suite = createAnalysisTestSuite({
  module: 'analyses/tier1/function-cycle-classifier/index',
  exports: { 
    classifyFunctionCycle,
    classifyAllFunctionCycles
  },
  analyzeFn: classifyAllFunctionCycles,
  expectedFields: {
    total: 'number',
    valid: 'number',
    problematic: 'number',
    classifications: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['classifyFunctionCycle', 'classifyAllFunctionCycles'],
    expectedSafeResult: { total: 0, valid: 0, problematic: 0, classifications: [] }
  },
  createMockInput: () => [[], {}],
  specificTests: [
    {
      name: 'classifies cycles using extracted metadata',
      test: () => {
        const cycle = ['src/a.js::initApp', 'src/a.js::initApp'];
        const atomsIndex = {
          'src/a.js': {
            atoms: [{ name: 'initApp', complexity: 1 }]
          }
        };
        const out = classifyFunctionCycle(cycle, atomsIndex);
        expect(out).toHaveProperty('category');
        expect(out).toHaveProperty('severity');
      }
    },
    {
      name: 'returns empty aggregate for no cycles',
      test: () => {
        const out = classifyAllFunctionCycles([], {});
        expect(out.total).toBe(0);
        expect(out.classifications).toEqual([]);
      }
    },
    {
      name: 'handles empty cycles array',
      test: () => {
        const out = classifyAllFunctionCycles([], {});
        expect(out.total).toBe(0);
        expect(out.valid).toBe(0);
        expect(out.problematic).toBe(0);
        expect(out.classifications).toEqual([]);
      }
    },
    {
      name: 'handles null/undefined cycles gracefully',
      test: () => {
        const out = classifyAllFunctionCycles(null, {});
        expect(out.total).toBe(0);
        expect(out.classifications).toEqual([]);
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier/index.js', suite);
