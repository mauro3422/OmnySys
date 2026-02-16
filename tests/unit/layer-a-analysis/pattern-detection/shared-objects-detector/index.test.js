/**
 * @fileoverview Tests for pattern-detection/shared-objects-detector/index - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/pattern-detection/shared-objects-detector/index.js';

createAnalysisTestSuite({
  module: 'pattern-detection/shared-objects-detector/index',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
