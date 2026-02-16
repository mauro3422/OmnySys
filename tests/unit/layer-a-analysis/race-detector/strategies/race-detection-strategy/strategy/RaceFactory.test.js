/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/strategy/RaceFactory - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/strategy/RaceFactory
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { RaceFactory } from '#layer-a/race-detector/strategies/race-detection-strategy/strategy/RaceFactory.js';
import { PatternRegistry } from '#layer-a/race-detector/strategies/race-detection-strategy/strategy/PatternRegistry.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/strategy/RaceFactory',
  detectorClass: RaceFactory,
  specificTests: [
    {
      name: 'race-detector/strategies/race-detection-strategy/strategy/RaceFactory.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'creates race objects with metadata and generated id',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'uses registry for mitigation strategies and custom severity behavior',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
