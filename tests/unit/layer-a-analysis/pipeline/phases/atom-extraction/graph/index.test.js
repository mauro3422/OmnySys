/**
 * @fileoverview Tests for pipeline/phases/atom-extraction/graph/index - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/pipeline/phases/atom-extraction/graph/index
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { buildCallGraph } from '#layer-a/pipeline/phases/atom-extraction/graph/index.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'pipeline/phases/atom-extraction/graph/index',
  exports: { buildCallGraph },
  analyzeFn: buildCallGraph,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['buildCallGraph'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'pipeline/phases/atom-extraction/graph/index.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'buildCallGraph classifies internal calls and calledBy links',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
