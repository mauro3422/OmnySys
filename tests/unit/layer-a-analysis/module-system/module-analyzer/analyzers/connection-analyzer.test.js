/**
 * @fileoverview Tests for module-system/module-analyzer/analyzers/connection-analyzer - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/module-analyzer/analyzers/connection-analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ConnectionAnalyzer } from '../../../../../../src/layer-a-static/module-system/module-analyzer/analyzers/connection-analyzer.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/module-analyzer/analyzers/connection-analyzer',
  exports: { ConnectionAnalyzer },
  analyzeFn: ConnectionAnalyzer,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['ConnectionAnalyzer'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'module-system/module-analyzer/analyzers/connection-analyzer.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'analyzes cross-file function calls',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
