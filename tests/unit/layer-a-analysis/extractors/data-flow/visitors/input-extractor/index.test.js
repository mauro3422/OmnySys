import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/data-flow/visitors/input-extractor/index.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/data-flow/visitors/input-extractor/index.js' });
});
