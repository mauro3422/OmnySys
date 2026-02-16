/**
 * @fileoverview Tests for extractors/metadata/error-flow - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/error-flow
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { extractErrorFlow } from '#layer-a/extractors/metadata/error-flow/index.js';
import * as legacy from '#layer-a/extractors/metadata/error-flow.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/error-flow',
  exports: { extractErrorFlow, legacy },
  analyzeFn: extractErrorFlow,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['extractErrorFlow', 'legacy'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/error-flow.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
