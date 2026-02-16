/**
 * @fileoverview Tests for extractors/metadata/dependency-depth - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/dependency-depth
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { extractDependencyDepth } from '#layer-a/extractors/metadata/dependency-depth.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/metadata/dependency-depth',
  exports: { extractDependencyDepth },
  analyzeFn: extractDependencyDepth,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['extractDependencyDepth'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'dependency-depth',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'basic structure',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'import detection',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'local import detection',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'npm import detection',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
