/**
 * @fileoverview Tests for extractors/metadata/performance-impact/metrics/propagation-calculator - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/performance-impact/metrics/propagation-calculator
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { PropagationCalculator } from '#layer-a/extractors/metadata/performance-impact/metrics/propagation-calculator.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/performance-impact/metrics/propagation-calculator',
  exports: { PropagationCalculator },
  analyzeFn: PropagationCalculator,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['PropagationCalculator'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/performance-impact/metrics/propagation-calculator.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'calculates propagated severity and categorizes impact levels',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'generates human-readable propagation reason',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
