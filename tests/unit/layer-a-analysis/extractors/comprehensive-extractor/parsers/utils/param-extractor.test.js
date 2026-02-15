import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/comprehensive-extractor/parsers/utils/param-extractor.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/comprehensive-extractor/parsers/utils/param-extractor.js' });
});
