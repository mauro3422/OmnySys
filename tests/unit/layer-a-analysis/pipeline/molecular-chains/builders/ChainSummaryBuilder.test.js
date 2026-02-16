/**
 * @fileoverview Tests for pipeline/molecular-chains/builders/ChainSummaryBuilder - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/pipeline/molecular-chains/builders/ChainSummaryBuilder.js';

createAnalysisTestSuite({
  module: 'pipeline/molecular-chains/builders/ChainSummaryBuilder',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
