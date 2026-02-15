import { describe, it, expect } from 'vitest';
import * as legacy from '#layer-a/extractors/metadata/temporal-connections.js';
import { TemporalConnectionExtractor as ExtractorFromIndex } from '#layer-a/extractors/metadata/temporal-connections/index.js';

describe('extractors/metadata/temporal-connections.js', () => {
  it('re-exports compatibility API from modular temporal-connections index', () => {
    expect(legacy.TemporalConnectionExtractor).toBeTypeOf('function');
    expect(legacy.extractTemporalPatterns).toBeTypeOf('function');
    expect(legacy.extractTemporalConnections).toBeTypeOf('function');
    expect(legacy.extractCrossFileTemporalConnections).toBeTypeOf('function');
    expect(legacy.detectTimeouts).toBeTypeOf('function');
    expect(legacy.analyzeDelay).toBeTypeOf('function');
  });

  it('keeps default export mapped to TemporalConnectionExtractor', () => {
    expect(legacy.default).toBe(ExtractorFromIndex);
  });
});

