/**
 * @fileoverview TypeScript Extractors - Meta-Factory
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';

describe('TypeScript Extractors', () => {
  it('typescript system available', async () => {
    const mod = await import('#layer-a/extractors/typescript/index.js');
    expect(mod).toBeDefined();
  });
});
