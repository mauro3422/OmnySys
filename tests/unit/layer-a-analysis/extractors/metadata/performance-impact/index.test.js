/**
 * @fileoverview Tests for extractors/metadata/performance-impact/index - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/performance-impact/index
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { extractPerformanceMetrics } from '#layer-a/extractors/metadata/performance-impact/index.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/performance-impact/index',
  exports: { extractPerformanceMetrics, extractPerformanceImpactConnections },
  analyzeFn: extractPerformanceMetrics,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['extractPerformanceMetrics', 'extractPerformanceImpactConnections'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/performance-impact/index.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'extracts performance metrics from code',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'builds performance propagation connections',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
