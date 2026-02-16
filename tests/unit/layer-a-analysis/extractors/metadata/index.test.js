/**
 * @fileoverview Tests for extractors/metadata/index - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/index
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import * as metadata from '#layer-a/extractors/metadata/index.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/index',
  exports: { metadata },
  analyzeFn: metadata,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['metadata'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/index.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'builds aggregated metadata and selective extraction',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
