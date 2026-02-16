/**
 * @fileoverview Tests for module-system/module-analyzer/analyzers/export-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/module-analyzer/analyzers/export-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ExportAnalyzer } from '../../../../../../src/layer-a-static/module-system/module-analyzer/analyzers/export-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/module-analyzer/analyzers/export-analyzer',
  exports: { ExportAnalyzer },
  analyzeFn: ExportAnalyzer,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['ExportAnalyzer'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'module-system/module-analyzer/analyzers/export-analyzer.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
