import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/typescript/extractors/type-extractor.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/typescript/extractors/type-extractor.js' });
});
