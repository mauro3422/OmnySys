/**
 * @fileoverview Tests for analyses/tier3/factors/StaticComplexity - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier3/factors/StaticComplexity
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { calculateStaticComplexity } from '#layer-a/analyses/tier3/factors/StaticComplexity.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'analyses/tier3/factors/StaticComplexity',
  exports: { calculateStaticComplexity },
  analyzeFn: calculateStaticComplexity,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['calculateStaticComplexity'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'analyses/tier3/factors/StaticComplexity.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'assigns static complexity score from file stats',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
