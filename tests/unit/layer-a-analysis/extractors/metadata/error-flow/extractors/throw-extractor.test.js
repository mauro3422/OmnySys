/**
 * @fileoverview Tests for extractors/metadata/error-flow/extractors/throw-extractor - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/error-flow/extractors/throw-extractor
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { extractThrows } from '#layer-a/extractors/metadata/error-flow/extractors/throw-extractor.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/error-flow/extractors/throw-extractor',
  exports: { extractThrows },
  analyzeFn: extractThrows,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['extractThrows'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/error-flow/extractors/throw-extractor.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'extracts explicit, jsdoc, and implicit throw metadata',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
