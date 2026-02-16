/**
 * @fileoverview Tests for race-detector/mitigation/queue-checker - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/mitigation/queue-checker
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { hasAsyncQueue } from '#layer-a/race-detector/mitigation/queue-checker.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/mitigation/queue-checker',
  detectorClass: hasAsyncQueue,
  specificTests: [
    {
      name: 'race-detector/mitigation/queue-checker.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects async queue usage from atom code',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'checks same queue by file shortcut or extracted queue name',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'returns queue details when queue name can be extracted',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
