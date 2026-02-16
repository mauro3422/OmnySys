/**
 * @fileoverview Tests for extractors/metadata/type-contracts - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/type-contracts
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import * as legacy from '#layer-a/extractors/metadata/type-contracts.js';
import * as modern from '#layer-a/extractors/metadata/type-contracts/index.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/type-contracts',
  exports: { legacy, modern },
  analyzeFn: legacy,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['legacy', 'modern'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/type-contracts.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
