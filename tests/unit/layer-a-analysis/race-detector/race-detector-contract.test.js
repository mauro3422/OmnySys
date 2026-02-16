/**
 * @fileoverview Tests for race-detector/race-detector-contract - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/race-detector/race-detector-contract.js';

createAnalysisTestSuite({
  module: 'race-detector/race-detector-contract',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
