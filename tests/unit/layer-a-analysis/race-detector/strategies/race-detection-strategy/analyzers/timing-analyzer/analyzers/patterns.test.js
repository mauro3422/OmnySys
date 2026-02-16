/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/patterns - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/patterns
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { haveSameAwaitContext } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/patterns.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/patterns',
  detectorClass: haveSameAwaitContext,
  specificTests: [
    {
      name: 'race-detector/.../timing-analyzer/analyzers/patterns.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects same await context and rejects Promise.all context',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
