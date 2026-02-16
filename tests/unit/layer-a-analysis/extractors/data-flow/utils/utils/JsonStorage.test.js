/**
 * @fileoverview Tests for extractors/data-flow/utils/utils/JsonStorage - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/utils/utils/JsonStorage.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/utils/utils/JsonStorage',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
