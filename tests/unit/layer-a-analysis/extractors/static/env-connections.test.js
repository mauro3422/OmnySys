import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/static/env-connections.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/static/env-connections.js' });
});
