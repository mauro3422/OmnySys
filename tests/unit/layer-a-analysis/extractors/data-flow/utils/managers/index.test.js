import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/data-flow/utils/managers/index.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/data-flow/utils/managers/index.js' });
});
