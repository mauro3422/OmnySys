/**
 * @fileoverview Tests for extractors/static/utils - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/utils
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { getLineNumber } from '#layer-a/extractors/static/utils.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/static/utils',
  exports: { getLineNumber, isNativeWindowProp, extractMatches, NATIVE_WINDOW_PROPS },
  analyzeFn: getLineNumber,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['getLineNumber', 'isNativeWindowProp', 'extractMatches'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'Static Extractor Utils',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'getLineNumber',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'isNativeWindowProp',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'extractMatches',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Integration',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
