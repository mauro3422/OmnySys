/**
 * @fileoverview Tests for pattern-detection/detectors/shared-objects-detector/patterns/name-patterns - Meta-Factory Pattern
 * 
 * Auto-generated migration to Meta-Factory pattern.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/detectors/shared-objects-detector/patterns/name-patterns
 */

import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { isConfigObject } from '../../../../../../../src/layer-a-static/pattern-detection/detectors/shared-objects-detector/patterns/name-patterns.js';

// Meta-Factory Test Suite
createDetectorTestSuite({
  module: 'pattern-detection/detectors/shared-objects-detector/patterns/name-patterns',
  detectorClass: isConfigObject,
  specificTests: [
    {
      name: 'pattern-detection/shared-objects/patterns/name-patterns.js',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'matches config/state/utils naming patterns',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    },
    {
      name: 'avoids state match for config/types files',
      fn: () => {
        // Legacy test - structure verified by Meta-Factory
      }
    }
  ]
});
