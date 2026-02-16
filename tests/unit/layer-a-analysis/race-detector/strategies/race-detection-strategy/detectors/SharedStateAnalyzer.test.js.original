import { describe, it, expect } from 'vitest';
import { SharedStateAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/detectors/SharedStateAnalyzer.js';

describe('race-detector/.../detectors/SharedStateAnalyzer.js', () => {
  it('analyzes shared-state map into categorized summaries', () => {
    const analyzer = new SharedStateAnalyzer();
    const shared = new Map([
      ['global:counter', [{ type: 'read', isAsync: true }, { type: 'write', isAsync: true }]],
      ['module:cache', [{ type: 'write', isAsync: false }, { type: 'write', isAsync: false }]]
    ]);
    const result = analyzer.analyze(shared);
    expect(result.totalKeys).toBe(2);
    expect(result.globalState.length).toBe(1);
    expect(result.moduleState.length).toBe(1);
    expect(result.highContention.length).toBeGreaterThanOrEqual(0);
  });
});

