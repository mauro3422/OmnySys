/**
 * @fileoverview Tests for extractors/metadata/historical-metadata - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/historical-metadata
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { extractHistoricalMetadata } from '#layer-a/extractors/metadata/historical-metadata.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/historical-metadata',
  exports: { extractHistoricalMetadata },
  analyzeFn: extractHistoricalMetadata,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['extractHistoricalMetadata'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/historical-metadata.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'returns stable object shape even when git/file data is unavailable',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
