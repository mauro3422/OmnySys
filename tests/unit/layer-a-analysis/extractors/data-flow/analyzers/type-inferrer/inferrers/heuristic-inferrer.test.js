/**
 * @fileoverview Tests for extractors/data-flow/analyzers/type-inferrer/inferrers/heuristic-inferrer - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/analyzers/type-inferrer/inferrers/heuristic-inferrer.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/analyzers/type-inferrer/inferrers/heuristic-inferrer',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
