/**
 * @fileoverview Tests for analyses/tier3/type-usage - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/analyses/tier3/type-usage.js';

createAnalysisTestSuite({
  module: 'analyses/tier3/type-usage',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
