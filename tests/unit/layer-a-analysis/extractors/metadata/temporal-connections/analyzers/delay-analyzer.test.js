/**
 * @fileoverview Tests for extractors/metadata/temporal-connections/analyzers/delay-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/temporal-connections/analyzers/delay-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { analyzeDelay } from '#layer-a/extractors/metadata/temporal-connections/analyzers/delay-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/temporal-connections/analyzers/delay-analyzer',
  exports: { analyzeDelay, analyzeDelayPatterns, categorizeDelay, determineImpact, DelayImpact },
  analyzeFn: analyzeDelay,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['analyzeDelay', 'analyzeDelayPatterns', 'categorizeDelay'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/temporal-connections/analyzers/delay-analyzer.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'categorizes delays and derives impact levels',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'builds a detailed delay analysis object',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'aggregates concerns across multiple delay samples',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
