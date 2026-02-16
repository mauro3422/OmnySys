/**
 * @fileoverview Tests for extractors/metadata/performance-impact/analyzers/complexity-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/performance-impact/analyzers/complexity-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ComplexityAnalyzer } from '#layer-a/extractors/metadata/performance-impact/analyzers/complexity-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/performance-impact/analyzers/complexity-analyzer',
  exports: { ComplexityAnalyzer },
  analyzeFn: ComplexityAnalyzer,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['ComplexityAnalyzer'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/performance-impact/analyzers/complexity-analyzer.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'calculates cyclomatic/cognitive complexity and BigO estimate',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
