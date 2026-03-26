/**
 * @fileoverview Extractors - Grupo 4: Data Flow
 */

import { describe } from 'vitest';
import { createAnalysisTestSuite, createModuleAvailabilityTest } from '#test-factories/test-suite-generator';

describe('Extractors - Data Flow', () => {
  createAnalysisTestSuite({
    module: 'extractors/data-flow',
    exports: {},
    expectedFields: { flows: 'array' },
    contractOptions: {
      async: false,
      exportNames: [],
      expectedSafeResult: { flows: [] }
    },
    specificTests: [
      {
        name: 'data-flow extractor available',
        fn: createModuleAvailabilityTest('#layer-a/extractors/data-flow/index.js')
      }
    ]
  });
});
