/**
 * @fileoverview Tests for extractors/data-flow/analyzers/type-inferrer/inferrers/type-rules - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/data-flow/analyzers/type-inferrer/inferrers/type-rules.js';

createAnalysisTestSuite({
  module: 'extractors/data-flow/analyzers/type-inferrer/inferrers/type-rules',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
