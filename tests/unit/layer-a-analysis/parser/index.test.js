/**
 * @fileoverview Tests for parser/index.js (Meta-Factory Pattern)
 * 
 * @module tests/unit/layer-a-analysis/parser/index
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { parseFile, parseFiles } from '#layer-a/parser/index.js';

createUtilityTestSuite({
  module: 'parser/index',
  exports: { parseFile, parseFiles },
  fn: parseFile,
  expectedSafeResult: null,
  specificTests: [
    {
      name: 'exports parse functions',
      fn: () => {
        expect(typeof parseFile).toBe('function');
        expect(typeof parseFiles).toBe('function');
      }
    }
  ]
});
