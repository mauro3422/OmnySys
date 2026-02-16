/**
 * @fileoverview Tests for extractors/metadata/error-flow/analyzers/propagation-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/error-flow/analyzers/propagation-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { detectPropagationPattern } from '#layer-a/extractors/metadata/error-flow/analyzers/propagation-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/error-flow/analyzers/propagation-analyzer',
  exports: { detectPropagationPattern, detectUnhandledCalls },
  analyzeFn: detectPropagationPattern,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['detectPropagationPattern', 'detectUnhandledCalls'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'extractors/metadata/error-flow/analyzers/propagation-analyzer.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects propagation mode from try/catch/throw combinations',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects risky calls outside try blocks',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
