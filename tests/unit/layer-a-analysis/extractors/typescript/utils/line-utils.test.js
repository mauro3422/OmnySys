import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/typescript/utils/line-utils.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/typescript/utils/line-utils.js' });
});
