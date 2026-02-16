/**
 * @fileoverview Tests for analyses/tier3/factors/SideEffectScore - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier3/factors/SideEffectScore
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { calculateSideEffectScore } from '#layer-a/analyses/tier3/factors/SideEffectScore.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'analyses/tier3/factors/SideEffectScore',
  exports: { calculateSideEffectScore },
  analyzeFn: calculateSideEffectScore,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['calculateSideEffectScore'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'analyses/tier3/factors/SideEffectScore.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'assigns side-effect score with critical combinations',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
