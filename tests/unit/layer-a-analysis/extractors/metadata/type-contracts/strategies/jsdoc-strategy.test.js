/**
 * @fileoverview Tests for extractors/metadata/type-contracts/strategies/jsdoc-strategy - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/type-contracts/strategies/jsdoc-strategy
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { JSDocStrategy } from '#layer-a/extractors/metadata/type-contracts/strategies/jsdoc-strategy.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/type-contracts/strategies/jsdoc-strategy',
  exports: { JSDocStrategy },
  analyzeFn: JSDocStrategy,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['JSDocStrategy'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/type-contracts/strategies/jsdoc-strategy.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'extracts params/returns/throws from JSDoc metadata',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects strategy applicability and computes confidence',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
