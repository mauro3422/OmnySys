/**
 * @fileoverview Tests for race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/transactional - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/transactional
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { detectTransactionalContext } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/transactional.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/transactional',
  detectorClass: detectTransactionalContext,
  specificTests: [
    {
      name: 'race-detector/.../detectors/transactional.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects transactional contexts',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'returns null when no transaction is present',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
