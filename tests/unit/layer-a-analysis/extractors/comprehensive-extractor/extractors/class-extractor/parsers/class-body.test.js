import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/comprehensive-extractor/extractors/class-extractor/parsers/class-body.js', () => {
  runExtractorContracts({
    sourceRelativePath: 'extractors/comprehensive-extractor/extractors/class-extractor/parsers/class-body.js',
    expectedRuntimeError: '../../parsers/ast-parser.js'
  });
});
