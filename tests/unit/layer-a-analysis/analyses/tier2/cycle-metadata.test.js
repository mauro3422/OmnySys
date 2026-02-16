/**
 * @fileoverview Tests for analyses/tier2/cycle-metadata - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/analyses/tier2/cycle-metadata.js';

createAnalysisTestSuite({
  module: 'analyses/tier2/cycle-metadata',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
