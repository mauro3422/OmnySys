/**
 * @fileoverview Tests for extractors/data-flow/utils/managers/DataSummarizers - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/utils/managers/DataSummarizers.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/utils/managers/DataSummarizers',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
