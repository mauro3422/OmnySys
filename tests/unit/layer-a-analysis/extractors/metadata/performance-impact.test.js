/**
 * @fileoverview Tests for extractors/metadata/performance-impact - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/performance-impact
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import * as legacy from '#layer-a/extractors/metadata/performance-impact.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/performance-impact',
  exports: { legacy },
  analyzeFn: legacy,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['legacy'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/performance-impact.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
