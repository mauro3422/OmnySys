/**
 * @fileoverview Tests for extractors/comprehensive-extractor/metadata/basic-metadata - Meta-Factory Pattern
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { main } from '#layer-a/extractors/comprehensive-extractor/metadata/basic-metadata.js';

createAnalysisTestSuite({
  module: 'extractors/comprehensive-extractor/metadata/basic-metadata',
  exports: { main },
  analyzeFn: main,
  expectedFields: { total: 'number' },
  contractOptions: {
    async: false,
    exportNames: ['main'],
    expectedSafeResult: { total: 0 }
  }
});
