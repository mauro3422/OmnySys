/**
 * @fileoverview Extractors - Grupo 6: TypeScript
 */

import { describe } from 'vitest';
import { createAnalysisTestSuite, createModuleAvailabilityTest } from '#test-factories/test-suite-generator';

describe('Extractors - TypeScript', () => {
  createAnalysisTestSuite({
    module: 'extractors/typescript',
    exports: {},
    expectedFields: { types: 'array' },
    contractOptions: {
      async: false,
      exportNames: [],
      expectedSafeResult: { types: [] }
    },
    specificTests: [
      {
        name: 'typescript extractor available',
        fn: createModuleAvailabilityTest('#layer-a/extractors/typescript/index.js')
      }
    ]
  });
});
