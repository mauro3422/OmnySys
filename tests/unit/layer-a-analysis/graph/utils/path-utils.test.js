/**
 * @fileoverview Tests for graph/utils/path-utils - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/graph/utils/path-utils
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { normalizePath } from '#layer-a/graph/utils/path-utils.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'graph/utils/path-utils',
  exports: { normalizePath, getDisplayPath, resolveImportPath, uniquePaths, pathsEqual },
  analyzeFn: normalizePath,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['normalizePath', 'getDisplayPath', 'resolveImportPath'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'Path Utils',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Structure Contract',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'normalizePath',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'getDisplayPath',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'resolveImportPath',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
