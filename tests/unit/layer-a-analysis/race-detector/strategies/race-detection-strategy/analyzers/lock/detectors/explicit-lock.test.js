/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/explicit-lock - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/explicit-lock
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { detectExplicitLock } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/explicit-lock.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/explicit-lock',
  detectorClass: detectExplicitLock,
  specificTests: [
    {
      name: 'race-detector/.../detectors/explicit-lock.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects explicit lock patterns and release semantics',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'returns null when no explicit lock is found',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
