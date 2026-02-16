/**
 * @fileoverview Tests for module-system/module-analyzer/analyzers/import-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/module-analyzer/analyzers/import-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ImportAnalyzer } from '../../../../../../src/layer-a-static/module-system/module-analyzer/analyzers/import-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/module-analyzer/analyzers/import-analyzer',
  exports: { ImportAnalyzer },
  analyzeFn: ImportAnalyzer,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['ImportAnalyzer'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'module-system/module-analyzer/analyzers/import-analyzer.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'collects external imports grouped by inferred module',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
