/**
 * @fileoverview Tests for pipeline/normalize.js (Meta-Factory Pattern)
 * 
 * @module tests/unit/layer-a-analysis/pipeline/normalize
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { normalizeParsedFiles, normalizeResolvedImports } from '#layer-a/pipeline/normalize.js';

createUtilityTestSuite({
  module: 'pipeline/normalize',
  exports: { normalizeParsedFiles, normalizeResolvedImports },
  fn: normalizeParsedFiles,
  expectedSafeResult: {},
  specificTests: [
    {
      name: 'exports normalize functions',
      fn: () => {
        expect(typeof normalizeParsedFiles).toBe('function');
        expect(typeof normalizeResolvedImports).toBe('function');
      }
    }
  ]
});
