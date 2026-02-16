/**
 * @fileoverview Tests for module-system/module-analyzer/chains/chain-builder - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/module-analyzer/chains/chain-builder
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ChainBuilder } from '../../../../../../src/layer-a-static/module-system/module-analyzer/chains/chain-builder.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/module-analyzer/chains/chain-builder',
  exports: { ChainBuilder },
  analyzeFn: ChainBuilder,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['ChainBuilder'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'module-system/module-analyzer/chains/chain-builder.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
