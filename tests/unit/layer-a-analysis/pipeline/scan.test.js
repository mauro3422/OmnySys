/**
 * @fileoverview Tests for pipeline/scan.js (Meta-Factory Pattern)
 * 
 * @module tests/unit/layer-a-analysis/pipeline/scan
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { scanProjectFiles, loadProjectInfo } from '#layer-a/pipeline/scan.js';

createUtilityTestSuite({
  module: 'pipeline/scan',
  exports: { scanProjectFiles, loadProjectInfo },
  fn: scanProjectFiles,
  expectedSafeResult: { files: [], relativeFiles: [] },
  specificTests: [
    {
      name: 'exports scan functions',
      fn: () => {
        expect(typeof scanProjectFiles).toBe('function');
        expect(typeof loadProjectInfo).toBe('function');
      }
    }
  ]
});
