import { describe, it, expect } from 'vitest';
import * as metadata from '#layer-a/extractors/metadata/index.js';

describe('extractors/metadata/index.js', () => {
  it('exports metadata extractors and orchestrator', () => {
    expect(metadata.extractAllMetadata).toBeTypeOf('function');
    expect(metadata.extractMetadataByCategory).toBeTypeOf('function');
    expect(metadata.extractJSDocContracts).toBeTypeOf('function');
    expect(metadata.extractRuntimeContracts).toBeTypeOf('function');
    expect(metadata.extractErrorFlow).toBeTypeOf('function');
    expect(metadata.extractPerformanceMetrics).toBeTypeOf('function');
  });

  it('builds aggregated metadata and selective extraction', () => {
    const code = `
      /** @param {number} x */
      function test(x) {
        if (!x) throw new Error("x");
        return x + 1;
      }
    `;
    const all = metadata.extractAllMetadata('src/test.js', code);
    expect(all).toHaveProperty('jsdoc');
    expect(all).toHaveProperty('runtime');
    expect(all).toHaveProperty('errorFlow');
    expect(all).toHaveProperty('performanceMetrics');
    const partial = metadata.extractMetadataByCategory(code, ['jsdoc', 'runtime']);
    expect(partial).toHaveProperty('jsdoc');
    expect(partial).toHaveProperty('runtime');
  });
});
