import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/typescript/parsers/interfaces.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/typescript/parsers/interfaces.js' });
});
