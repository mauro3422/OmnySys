/**
 * @fileoverview Tests for query/queries/file-query/enriched/index - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/query/queries/file-query/enriched/index.js';

createAnalysisTestSuite({
  module: 'query/queries/file-query/enriched/index',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
