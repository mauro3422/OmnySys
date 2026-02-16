/**
 * @fileoverview Tests for analyses/tier2/unused-imports - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/analyses/tier2/unused-imports.js';

createAnalysisTestSuite({
  module: 'analyses/tier2/unused-imports',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
