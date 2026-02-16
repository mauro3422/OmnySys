import { describe, it, expect } from 'vitest';
import { TemporalConnectionExtractor } from '#layer-a/extractors/metadata/temporal-connections/TemporalConnectionExtractor.js';

describe('extractors/metadata/temporal-connections/TemporalConnectionExtractor.js', () => {
  it('extracts patterns and includes timer analysis for timeout/interval', () => {
    const extractor = new TemporalConnectionExtractor();
    const code = `
      setTimeout(() => run(), 50);
      setInterval(() => tick(), 2000);
    `;
    const out = extractor.extractPatterns(code, { name: 'initRuntime' });
    expect(out.timers.length).toBe(2);
    expect(out.timerAnalysis.length).toBe(2);
  });

  it('builds temporal dependency connections from atoms', () => {
    const extractor = new TemporalConnectionExtractor();
    const atoms = [
      { id: 'a1', name: 'initStore', temporal: { executionOrder: { mustRunBefore: [{ reason: 'init' }] } } },
      { id: 'a2', name: 'useStore', temporal: { executionOrder: { mustRunAfter: [{ reason: 'consume' }] } } }
    ];
    const connections = extractor.extractConnections(atoms);
    expect(connections.some(c => c.type === 'temporal-dependency')).toBe(true);
  });
});

