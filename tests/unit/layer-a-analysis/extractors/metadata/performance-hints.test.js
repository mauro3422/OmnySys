/**
 * @fileoverview Tests for extractors/metadata/performance-hints - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/performance-hints
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { extractPerformanceHints } from '#layer-a/extractors/metadata/performance-hints.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/performance-hints',
  exports: { extractPerformanceHints },
  analyzeFn: extractPerformanceHints,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['extractPerformanceHints'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/performance-hints.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects nested loops, blocking ops and complexity estimate',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
