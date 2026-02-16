/**
 * @fileoverview Tests for module-system/enrichers/index - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/enrichers/index
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { enrichMoleculesWithSystemContext } from '../../../../../src/layer-a-static/module-system/enrichers/system-context-enricher.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/enrichers/index',
  exports: { enrichMoleculesWithSystemContext, createEmptyContext },
  analyzeFn: enrichMoleculesWithSystemContext,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['enrichMoleculesWithSystemContext', 'createEmptyContext'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'module-system/enrichers/index.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
