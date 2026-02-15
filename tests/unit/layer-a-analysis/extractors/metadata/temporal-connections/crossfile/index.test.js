import { describe, it, expect } from 'vitest';
import * as crossfile from '#layer-a/extractors/metadata/temporal-connections/crossfile/index.js';

describe('extractors/metadata/temporal-connections/crossfile/index.js', () => {
  it('re-exports cross-file detector API', () => {
    expect(crossfile.extractCrossFileConnections).toBeTypeOf('function');
    expect(crossfile.findProviderFiles).toBeTypeOf('function');
    expect(crossfile.findConsumerFiles).toBeTypeOf('function');
  });
});

