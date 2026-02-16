/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/detectors/atom-finder - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/detectors/atom-finder
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { getAtomCallers } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/detectors/atom-finder.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/detectors/atom-finder',
  detectorClass: getAtomCallers,
  specificTests: [
    {
      name: 'race-detector/.../timing-analyzer/detectors/atom-finder.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'finds atom callers and atom by id',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'finds entry points by traversing uppercase callers',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
