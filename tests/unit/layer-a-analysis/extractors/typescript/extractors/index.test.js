/**
 * @fileoverview Tests for extractors/typescript/extractors/index - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/typescript/extractors/index.js';

createAnalysisTestSuite({
  module: 'extractors/typescript/extractors/index',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
