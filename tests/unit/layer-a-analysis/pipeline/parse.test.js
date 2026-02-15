/**
 * @fileoverview Tests for pipeline/parse.js (Meta-Factory Pattern)
 * 
 * @module tests/unit/layer-a-analysis/pipeline/parse
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { parseFiles } from '#layer-a/pipeline/parse.js';

createUtilityTestSuite({
  module: 'pipeline/parse',
  exports: { parseFiles },
  fn: parseFiles,
  expectedSafeResult: {},
  specificTests: [
    {
      name: 'exports parseFiles function',
      fn: () => {
        expect(typeof parseFiles).toBe('function');
      }
    }
  ]
});
