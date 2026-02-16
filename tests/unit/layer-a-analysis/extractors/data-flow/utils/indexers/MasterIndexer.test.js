/**
 * @fileoverview Tests for extractors/data-flow/utils/indexers/MasterIndexer - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/utils/indexers/MasterIndexer.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/utils/indexers/MasterIndexer',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
