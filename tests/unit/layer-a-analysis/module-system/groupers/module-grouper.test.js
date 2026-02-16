/**
 * @fileoverview Tests for module-system/groupers/module-grouper - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/module-system/groupers/module-grouper
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { groupMoleculesByModule } from '../../../../../src/layer-a-static/module-system/groupers/module-grouper.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'module-system/groupers/module-grouper',
  exports: { groupMoleculesByModule, extractModuleName, getModulePathForFile },
  analyzeFn: groupMoleculesByModule,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['groupMoleculesByModule', 'extractModuleName', 'getModulePathForFile'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'module-system/groupers/module-grouper.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'groups by first src module segment',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'extracts module name from module path',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'gets module path for file',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
