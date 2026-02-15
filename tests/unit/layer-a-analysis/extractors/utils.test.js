import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/utils.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/utils.js' });
});
