import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/comprehensive-extractor/metrics/metrics-calculator.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/comprehensive-extractor/metrics/metrics-calculator.js' });
});
