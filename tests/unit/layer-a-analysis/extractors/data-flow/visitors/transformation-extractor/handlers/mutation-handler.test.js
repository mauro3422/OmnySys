import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/data-flow/visitors/transformation-extractor/handlers/mutation-handler.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/data-flow/visitors/transformation-extractor/handlers/mutation-handler.js' });
});
