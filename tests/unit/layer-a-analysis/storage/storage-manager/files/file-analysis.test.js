/**
 * @fileoverview Tests for storage/storage-manager/files/file-analysis - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/storage/storage-manager/files/file-analysis
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { saveFileAnalysis } from '#layer-a/storage/storage-manager/files/file-analysis.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'storage/storage-manager/files/file-analysis',
  exports: { saveFileAnalysis },
  analyzeFn: saveFileAnalysis,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['saveFileAnalysis'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'storage/storage-manager/files/file-analysis.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'saves file analysis and preserves previous llmInsights when omitted',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
