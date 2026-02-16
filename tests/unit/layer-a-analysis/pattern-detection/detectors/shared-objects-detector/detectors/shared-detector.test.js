/**
 * @fileoverview Tests for pattern-detection/detectors/shared-objects-detector/detectors/shared-detector - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/pattern-detection/detectors/shared-objects-detector/detectors/shared-detector.js';

createAnalysisTestSuite({
  module: 'pattern-detection/detectors/shared-objects-detector/detectors/shared-detector',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
