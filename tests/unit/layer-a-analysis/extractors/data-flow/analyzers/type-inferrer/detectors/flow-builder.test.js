import { describe } from 'vitest';
import { runExtractorContracts } from '#test-factories/extractor-contracts.factory.js';

describe('layer-a-static/extractors/data-flow/analyzers/type-inferrer/detectors/flow-builder.js', () => {
  runExtractorContracts({ sourceRelativePath: 'extractors/data-flow/analyzers/type-inferrer/detectors/flow-builder.js' });
});
