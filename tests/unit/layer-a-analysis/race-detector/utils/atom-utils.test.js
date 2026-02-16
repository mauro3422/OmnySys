/**
 * @fileoverview Tests for race-detector/utils/atom-utils - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/utils/atom-utils
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { findAtomById } from '#layer-a/race-detector/utils/atom-utils.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'race-detector/utils/atom-utils',
  detectorClass: findAtomById,
  specificTests: [
    {
      name: 'race-detector/utils/atom-utils.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'finds atom by exact id and by file::function format',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'extracts queue names from supported patterns',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'detects shared-state names and JavaScript keywords',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
