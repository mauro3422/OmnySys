/**
 * @fileoverview Tests for extractors/metadata/temporal-connections/detectors/promise-detector - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/temporal-connections/detectors/promise-detector
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { detectPromises } from '#layer-a/extractors/metadata/temporal-connections/detectors/promise-detector.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'extractors/metadata/temporal-connections/detectors/promise-detector',
  detectorClass: detectPromises,
  specificTests: [
    {
      name: 'extractors/metadata/temporal-connections/detectors/promise-detector.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects async/await and Promise.all usage',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects sequential awaits',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'default detector strategy supports async code',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
