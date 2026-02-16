/**
 * @fileoverview Tier 3 Analyses - Meta-Factory
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import * as tier3 from '#layer-a/analyses/tier3/index.js';

describe('Analyses Tier 3', () => {
  createAnalysisTestSuite({
    module: 'analyses/tier3/index',
    exports: tier3,
    analyzeFn: tier3.detectSideEffectMarkers || Object.values(tier3)[0],
    expectedFields: { total: 'number' },
    contractOptions: {
      async: false,
      exportNames: Object.keys(tier3).slice(0, 10),
      expectedSafeResult: { total: 0 }
    }
  });
});
