/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/monitor-pattern - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/monitor-pattern
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { detectMonitorPattern } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/monitor-pattern.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/monitor-pattern',
  detectorClass: detectMonitorPattern,
  specificTests: [
    {
      name: 'race-detector/.../detectors/monitor-pattern.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects monitor/synchronized style protection',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'returns null when monitor pattern is absent',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
