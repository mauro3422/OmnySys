/**
 * @fileoverview Tests for analyses/tier2/cycle-rules - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/analyses/tier2/cycle-rules.js';

createAnalysisTestSuite({
  module: 'analyses/tier2/cycle-rules',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
