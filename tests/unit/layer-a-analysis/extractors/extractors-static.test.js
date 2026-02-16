/**
 * @fileoverview Static Extractors - Meta-Factory
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';

describe('Static Extractors', () => {
  it('static extraction available', async () => {
    const mod = await import('#layer-a/extractors/static/index.js');
    expect(mod).toBeDefined();
  });
});
