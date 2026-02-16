/**
 * @fileoverview Tests for pipeline/molecular-chains/builders/ChainStepBuilder - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/pipeline/molecular-chains/builders/ChainStepBuilder.js';

createAnalysisTestSuite({
  module: 'pipeline/molecular-chains/builders/ChainStepBuilder',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
