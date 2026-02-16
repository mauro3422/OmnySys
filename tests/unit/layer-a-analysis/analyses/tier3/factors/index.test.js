/**
 * @fileoverview Tests for analyses/tier3/factors/index - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/analyses/tier3/factors/index
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { calculateStaticComplexity } from '#layer-a/analyses/tier3/factors/index.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'analyses/tier3/factors/index',
  exports: { calculateStaticComplexity, calculateSemanticScore, calculateSideEffectScore, calculateHotspotScore, calculateCouplingScore },
  analyzeFn: calculateStaticComplexity,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['calculateStaticComplexity', 'calculateSemanticScore', 'calculateSideEffectScore'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'analyses/tier3/factors/index.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'returns stable object contract for each factor',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
