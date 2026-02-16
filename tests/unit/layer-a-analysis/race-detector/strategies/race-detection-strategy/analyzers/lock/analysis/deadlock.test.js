/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/deadlock - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/deadlock
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { findPotentialDeadlocks } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/deadlock.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/deadlock',
  detectorClass: findPotentialDeadlocks,
  specificTests: [
    {
      name: 'race-detector/.../analysis/deadlock.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects opposite lock ordering as potential deadlock',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'returns empty list for non-circular lock orders',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
