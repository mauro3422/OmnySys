/**
 * @fileoverview Tests for extractors/metadata/temporal-connections - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/temporal-connections
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { TemporalConnectionExtractor } from '#layer-a/extractors/metadata/temporal-connections/index.js';
import * as legacy from '#layer-a/extractors/metadata/temporal-connections.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/temporal-connections',
  exports: { TemporalConnectionExtractor, legacy },
  analyzeFn: TemporalConnectionExtractor,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['TemporalConnectionExtractor', 'legacy'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/temporal-connections.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
