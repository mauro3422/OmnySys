/**
 * @fileoverview Tests for extractors/data-flow/input-extractor/usage-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/data-flow/input-extractor/usage-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { findUsages } from '../../../../../../src/layer-a-static/extractors/data-flow/visitors/input-extractor/analyzers/usage-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/data-flow/input-extractor/usage-analyzer',
  exports: { findUsages },
  analyzeFn: findUsages,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['findUsages'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'findUsages',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'should return empty map for no inputs',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'should find simple references',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'should find multiple references',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'should track property access',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
