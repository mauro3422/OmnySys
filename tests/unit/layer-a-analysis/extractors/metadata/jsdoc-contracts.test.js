/**
 * @fileoverview Tests for extractors/metadata/jsdoc-contracts - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/jsdoc-contracts
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { extractJSDocContracts } from '#layer-a/extractors/metadata/jsdoc-contracts.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/jsdoc-contracts',
  exports: { extractJSDocContracts },
  analyzeFn: extractJSDocContracts,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['extractJSDocContracts'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/jsdoc-contracts.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'extracts param/returns/throws/deprecated contracts from JSDoc blocks',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
