import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/typescript/parsers/imports.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/typescript/parsers/imports.js' });
});
