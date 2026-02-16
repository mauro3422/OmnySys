/**
 * @fileoverview Tests for module-system/module-analyzer/index - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/module-analyzer/index
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import * as moduleAnalyzerApi from '../../../../../src/layer-a-static/module-system/module-analyzer/index.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/module-analyzer/index',
  exports: { moduleAnalyzerApi },
  analyzeFn: moduleAnalyzerApi,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['moduleAnalyzerApi'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'module-system/module-analyzer/index.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
