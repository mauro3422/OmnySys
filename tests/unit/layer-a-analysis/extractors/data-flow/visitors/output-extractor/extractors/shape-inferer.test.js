import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/data-flow/visitors/output-extractor/extractors/shape-inferer.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/data-flow/visitors/output-extractor/extractors/shape-inferer.js' });
});
