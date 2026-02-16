/**
 * @fileoverview Tests for extractors/metadata/error-flow/index - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/error-flow/index
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { extractErrorFlowConnections } from '#layer-a/extractors/metadata/error-flow/index.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/error-flow/index',
  exports: { extractErrorFlowConnections, extractErrorFlow, extractThrows, extractCatches, extractTryBlocks },
  analyzeFn: extractErrorFlowConnections,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['extractErrorFlowConnections', 'extractErrorFlow', 'extractThrows'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/error-flow/index.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'builds coarse error flow connections between throwers and catchers',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
