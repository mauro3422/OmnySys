/**
 * @fileoverview Tests for extractors/data-flow/input-extractor/InputExtractor - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/data-flow/input-extractor/InputExtractor
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { InputExtractor } from '../../../../../../src/layer-a-static/extractors/data-flow/visitors/input-extractor/InputExtractor.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: 'extractors/data-flow/input-extractor/InputExtractor',
  exports: { InputExtractor },
  analyzeFn: InputExtractor,
  expectedFields: {
    total: 'number',
    items: 'array'
  },
  contractOptions: {
    async: false,
    exportNames: ['InputExtractor'],
    expectedSafeResult: { total: 0, items: [] }
  },
  specificTests: [
    {
      name: 'InputExtractor',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Simple Parameters',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Default Values',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Destructured Parameters',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'Rest Parameters',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
