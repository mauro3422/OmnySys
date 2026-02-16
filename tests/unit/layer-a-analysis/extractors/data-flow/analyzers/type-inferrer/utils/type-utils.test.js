/**
 * @fileoverview Tests for extractors/data-flow/analyzers/type-inferrer/utils/type-utils - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/analyzers/type-inferrer/utils/type-utils.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/analyzers/type-inferrer/utils/type-utils',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
