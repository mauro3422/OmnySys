/**
 * @fileoverview Tests for query/apis/apis-index - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/query/apis/apis-index.js';

createAnalysisTestSuite({
  module: 'query/apis/apis-index',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
