import { describe, it, expect } from 'vitest';
import * as temporal from '#layer-a/extractors/metadata/temporal-connections/index.js';

describe('extractors/metadata/temporal-connections/index.js', () => {
  it('exports modular entry points and legacy facades', () => {
    expect(temporal.TemporalConnectionExtractor).toBeTypeOf('function');
    expect(temporal.extractTemporalPatterns).toBeTypeOf('function');
    expect(temporal.extractTemporalConnections).toBeTypeOf('function');
    expect(temporal.extractCrossFileTemporalConnections).toBeTypeOf('function');
  });

  it('legacy facade can extract patterns from real code', () => {
    const code = 'setTimeout(() => console.log("x"), 10);';
    const result = temporal.extractTemporalPatterns(code, { name: 'initApp' });
    expect(result).toHaveProperty('timers');
    expect(result.timers.length).toBeGreaterThan(0);
    expect(result).toHaveProperty('executionOrder');
  });
});

