/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/strategy/PatternRegistry - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/race-detector/strategies/race-detection-strategy/strategy/PatternRegistry.js';

createAnalysisTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/strategy/PatternRegistry',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
