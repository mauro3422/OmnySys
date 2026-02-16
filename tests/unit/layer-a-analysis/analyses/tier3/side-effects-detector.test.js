/**
 * @fileoverview Tests for analyses/tier3/side-effects-detector - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/analyses/tier3/side-effects-detector.js';

createAnalysisTestSuite({
  module: 'analyses/tier3/side-effects-detector',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
