/**
 * @fileoverview Atomic Extractors - Meta-Factory
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import {
  extractArrowFunctions,
  extractClassMethods,
  extractFunctions
} from '#layer-a/extractors/atomic/index.js';

describe('Atomic Extractors', () => {
  createAnalysisTestSuite({
    module: 'extractors/atomic',
    exports: { extractArrowFunctions, extractClassMethods, extractFunctions },
    analyzeFn: extractFunctions,
    expectedFields: { functions: 'array', arrows: 'array', methods: 'array' },
    contractOptions: {
      async: false,
      exportNames: ['extractArrowFunctions', 'extractClassMethods', 'extractFunctions'],
      expectedSafeResult: { functions: [], arrows: [], methods: [] }
    }
  });
});
