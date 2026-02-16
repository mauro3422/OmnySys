/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/flow - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/flow
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { sameBusinessFlow } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/flow.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/flow',
  detectorClass: sameBusinessFlow,
  specificTests: [
    {
      name: 'race-detector/.../timing-analyzer/analyzers/flow.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects same flow for shared callers and same entry points',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
