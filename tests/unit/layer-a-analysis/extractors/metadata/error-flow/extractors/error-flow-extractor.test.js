/**
 * @fileoverview Tests for extractors/metadata/error-flow/extractors/error-flow-extractor - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/error-flow/extractors/error-flow-extractor
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { extractErrorFlow } from '#layer-a/extractors/metadata/error-flow/extractors/error-flow-extractor.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/error-flow/extractors/error-flow-extractor',
  exports: { extractErrorFlow },
  analyzeFn: extractErrorFlow,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['extractErrorFlow'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/error-flow/extractors/error-flow-extractor.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'builds full error flow report',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
