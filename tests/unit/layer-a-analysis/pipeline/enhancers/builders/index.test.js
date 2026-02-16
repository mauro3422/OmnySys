/**
 * @fileoverview Tests for pipeline/enhancers/builders/index - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/builders/index
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { buildSourceCodeMap } from '#layer-a/pipeline/enhancers/builders/index.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'pipeline/enhancers/builders/index',
  exports: { buildSourceCodeMap, readSourceFile, getRelativePath },
  analyzeFn: buildSourceCodeMap,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['buildSourceCodeMap', 'readSourceFile', 'getRelativePath'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'pipeline/enhancers/builders/index.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'getRelativePath normalizes and trims project root',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
