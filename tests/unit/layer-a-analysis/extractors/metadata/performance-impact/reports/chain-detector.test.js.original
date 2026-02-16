import { describe, it, expect } from 'vitest';
import { ChainDetector } from '#layer-a/extractors/metadata/performance-impact/reports/chain-detector.js';

describe('extractors/metadata/performance-impact/reports/chain-detector.js', () => {
  it('detects critical chains from high severity connections', () => {
    const detector = new ChainDetector();
    const chains = detector.detect([
      { from: 'A', to: 'B', impact: { severity: 'high' } },
      { from: 'B', to: 'C', impact: { severity: 'critical' } }
    ]);
    expect(chains.length).toBeGreaterThan(0);
    expect(chains[0]).toHaveProperty('type', 'performance-chain');
  });

  it('computes chain severity from performance map', () => {
    const detector = new ChainDetector();
    const severity = detector.getChainSeverity(
      ['A', 'B', 'C'],
      new Map([['A', { impactScore: 0.8 }], ['B', { impactScore: 0.7 }], ['C', { impactScore: 0.6 }]])
    );
    expect(['critical', 'high', 'medium', 'low']).toContain(severity);
  });
});

