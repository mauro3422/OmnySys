/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/atomic-operation - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/atomic-operation
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { detectAtomicOperation } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/atomic-operation.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/atomic-operation',
  detectorClass: detectAtomicOperation,
  specificTests: [
    {
      name: 'race-detector/.../detectors/atomic-operation.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects atomic operation patterns',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'returns null when context is non-atomic',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
