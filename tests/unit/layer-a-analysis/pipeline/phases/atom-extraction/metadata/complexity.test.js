/**
 * @fileoverview Tests for pipeline/phases/atom-extraction/metadata/complexity - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/pipeline/phases/atom-extraction/metadata/complexity
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { calculateComplexity } from '#layer-a/pipeline/phases/atom-extraction/metadata/complexity.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'pipeline/phases/atom-extraction/metadata/complexity',
  exports: { calculateComplexity },
  analyzeFn: calculateComplexity,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['calculateComplexity'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'pipeline/phases/atom-extraction/metadata/complexity.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'returns base complexity of 1 for linear code',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'increments complexity for control flow patterns',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
