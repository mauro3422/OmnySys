/**
 * @fileoverview Tests for extractors/data-flow/analyzers/type-inferrer/index - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/analyzers/type-inferrer/index.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/analyzers/type-inferrer/index',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
