/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/patterns/builtin-patterns - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/race-detector/strategies/race-detection-strategy/patterns/builtin-patterns.js';

createAnalysisTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/patterns/builtin-patterns',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
