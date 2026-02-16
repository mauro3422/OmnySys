/**
 * @fileoverview Tests for extractors/typescript/connections/type-usages - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/typescript/connections/type-usages.js';

createAnalysisTestSuite({
  module: 'extractors/typescript/connections/type-usages',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
