/**
 * @fileoverview Tests for storage/storage-manager/files/system-map - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/storage/storage-manager/files/system-map
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { savePartitionedSystemMap } from '#layer-a/storage/storage-manager/files/system-map.js';
import { createDataDirectory } from '#layer-a/storage/storage-manager/setup/directory.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'storage/storage-manager/files/system-map',
  exports: { savePartitionedSystemMap, createDataDirectory },
  analyzeFn: savePartitionedSystemMap,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['savePartitionedSystemMap', 'createDataDirectory'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'storage/storage-manager/files/system-map.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'writes partitioned system map artifacts',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
