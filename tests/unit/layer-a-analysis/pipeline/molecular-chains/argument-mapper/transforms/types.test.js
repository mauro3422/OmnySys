/**
 * @fileoverview Tests for pipeline/molecular-chains/argument-mapper/transforms/types - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/pipeline/molecular-chains/argument-mapper/transforms/types.js';

createAnalysisTestSuite({
  module: 'pipeline/molecular-chains/argument-mapper/transforms/types',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
