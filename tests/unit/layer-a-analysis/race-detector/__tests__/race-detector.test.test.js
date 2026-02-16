/**
 * @fileoverview Tests for race-detector/__tests__/race-detector.test - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/race-detector/__tests__/race-detector.test.js';

createAnalysisTestSuite({
  module: 'race-detector/__tests__/race-detector.test',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
