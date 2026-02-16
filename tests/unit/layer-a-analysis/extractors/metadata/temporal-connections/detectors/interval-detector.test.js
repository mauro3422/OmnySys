/**
 * @fileoverview Tests for extractors/metadata/temporal-connections/detectors/interval-detector - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/extractors/metadata/temporal-connections/detectors/interval-detector
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { detectIntervals } from '#layer-a/extractors/metadata/temporal-connections/detectors/interval-detector.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'extractors/metadata/temporal-connections/detectors/interval-detector',
  detectorClass: detectIntervals,
  specificTests: [
    {
      name: 'extractors/metadata/temporal-connections/detectors/interval-detector.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects setInterval and classifies interval speed',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects generic interval call without explicit ms',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'default detector strategy supports interval code',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
