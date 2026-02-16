/**
 * @fileoverview Tests for race-detector/race-pattern-matcher - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/race-detector/race-pattern-matcher.js';

createAnalysisTestSuite({
  module: 'race-detector/race-pattern-matcher',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
