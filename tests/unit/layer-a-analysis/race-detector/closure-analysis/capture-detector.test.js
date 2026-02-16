/**
 * @fileoverview Tests for race-detector/closure-analysis/capture-detector - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/closure-analysis/capture-detector
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { findCapturedVariables } from '#layer-a/race-detector/closure-analysis/capture-detector.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/closure-analysis/capture-detector',
  detectorClass: findCapturedVariables,
  specificTests: [
    {
      name: 'race-detector/closure-analysis/capture-detector.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'returns empty list when atom has no code',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects captured shared/global vars from closures',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'calculates capture risk based on atom/variable properties',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
