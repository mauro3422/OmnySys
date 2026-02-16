/**
 * @fileoverview Tests for storage/storage-manager/setup/directory - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/storage/storage-manager/setup/directory
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { createDataDirectory } from '#layer-a/storage/storage-manager/setup/directory.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'storage/storage-manager/setup/directory',
  exports: { createDataDirectory, getDataDirectory, hasExistingAnalysis },
  analyzeFn: createDataDirectory,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['createDataDirectory', 'getDataDirectory', 'hasExistingAnalysis'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'storage/storage-manager/setup/directory.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
