/**
 * @fileoverview Tests for extractors/typescript/utils/line-utils - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/typescript/utils/line-utils.js';

createAnalysisTestSuite({
  module: 'extractors/typescript/utils/line-utils',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
