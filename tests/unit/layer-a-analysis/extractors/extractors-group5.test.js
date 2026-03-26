/**
 * @fileoverview Extractors - Grupo 5: Metadata
 */

import { describe } from 'vitest';
import { createAnalysisTestSuite, createModuleAvailabilityTest } from '#test-factories/test-suite-generator';

describe('Extractors - Metadata', () => {
  createAnalysisTestSuite({
    module: 'extractors/metadata',
    exports: {},
    expectedFields: { metadata: 'object' },
    contractOptions: {
      async: false,
      exportNames: [],
      expectedSafeResult: { metadata: {} }
    },
    specificTests: [
      {
        name: 'metadata extractor available',
        fn: createModuleAvailabilityTest('#layer-a/extractors/metadata/index.js')
      }
    ]
  });
});
