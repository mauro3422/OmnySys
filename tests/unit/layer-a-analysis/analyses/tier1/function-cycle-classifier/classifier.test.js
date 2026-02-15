/**
 * @fileoverview Tests for function-cycle-classifier/classifier.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { classifyCycle, aggregateClassifications } from '#layer-a/analyses/tier1/function-cycle-classifier/classifier.js';

// Contract-based test suite
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/function-cycle-classifier/classifier',
  exports: { classifyCycle, aggregateClassifications },
  specificTests: [
    {
      name: 'returns UNKNOWN classification when no rules match',
      test: () => {
        const cycle = ['a::x', 'b::y', 'c::z'];
        const out = classifyCycle(cycle, {});
        expect(out.category).toBe('UNKNOWN');
        expect(out.autoIgnore).toBe(false);
      }
    },
    {
      name: 'aggregates valid/problematic counters from classifications',
      test: () => {
        const cycles = [['a'], ['b']];
        const classifications = [
          { category: 'VALID_PATTERN', autoIgnore: true, cycle: ['a'] },
          { category: 'CRITICAL_ISSUE', autoIgnore: false, cycle: ['b'] }
        ];
        const out = aggregateClassifications(cycles, classifications);
        expect(out.total).toBe(2);
        expect(out.valid).toBe(1);
        expect(out.problematic).toBe(1);
      }
    },
    {
      name: 'handles empty cycles array',
      test: () => {
        const out = aggregateClassifications([], []);
        expect(out.total).toBe(0);
        expect(out.valid).toBe(0);
        expect(out.problematic).toBe(0);
      }
    },
    {
      name: 'handles null/undefined inputs gracefully',
      test: () => {
        const out = aggregateClassifications(null, null);
        expect(out.total).toBe(0);
        expect(out.classifications).toEqual([]);
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier/classifier.js', suite);
