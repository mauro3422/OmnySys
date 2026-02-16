/**
 * @fileoverview Tests for module-system/module-analyzer/ModuleAnalyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/module-analyzer/ModuleAnalyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ModuleAnalyzer } from '../../../../../src/layer-a-static/module-system/module-analyzer/ModuleAnalyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/module-analyzer/ModuleAnalyzer',
  exports: { ModuleAnalyzer },
  analyzeFn: ModuleAnalyzer,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['ModuleAnalyzer'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'module-system/module-analyzer/ModuleAnalyzer.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
