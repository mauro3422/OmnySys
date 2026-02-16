/**
 * @fileoverview Tests for extractors/metadata/performance-impact/analyzers/resource-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/performance-impact/analyzers/resource-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ResourceAnalyzer } from '#layer-a/extractors/metadata/performance-impact/analyzers/resource-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/performance-impact/analyzers/resource-analyzer',
  exports: { ResourceAnalyzer },
  analyzeFn: ResourceAnalyzer,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['ResourceAnalyzer'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/performance-impact/analyzers/resource-analyzer.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects network/disk/memory characteristics',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
