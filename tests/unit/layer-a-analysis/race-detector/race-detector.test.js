/**
 * @fileoverview Race Detector System
 */

import { describe } from 'vitest';
import { createAnalysisTestSuite, createModuleAvailabilityTest } from '#test-factories/test-suite-generator';

describe('Race Detector System', () => {
  createAnalysisTestSuite({
    module: 'race-detector',
    exports: {},
    expectedFields: { races: 'array' },
    contractOptions: {
      async: false,
      exportNames: [],
      expectedSafeResult: { races: [] }
    },
    specificTests: [
      {
        name: 'race detector module available',
        fn: createModuleAvailabilityTest('#layer-a/race-detector/index.js')
      }
    ]
  });
});
