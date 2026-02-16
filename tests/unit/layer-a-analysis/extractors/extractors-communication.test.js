/**
 * @fileoverview Communication Extractors - Meta-Factory
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import * as comm from '#layer-a/extractors/communication/index.js';

describe('Communication Extractors', () => {
  createAnalysisTestSuite({
    module: 'extractors/communication',
    exports: comm,
    analyzeFn: Object.values(comm)[0] || (() => []),
    expectedFields: { connections: 'array' },
    contractOptions: {
      async: false,
      exportNames: Object.keys(comm).slice(0, 5),
      expectedSafeResult: { connections: [] }
    }
  });
});
