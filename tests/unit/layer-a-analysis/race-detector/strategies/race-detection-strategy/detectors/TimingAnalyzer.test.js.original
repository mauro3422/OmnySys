import { describe, it, expect } from 'vitest';
import { TimingAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/detectors/TimingAnalyzer.js';

describe('race-detector/.../detectors/TimingAnalyzer.js', () => {
  it('evaluates concurrency and entry points in detector timing analyzer', () => {
    const analyzer = new TimingAnalyzer();
    const project = {
      modules: {
        m1: {
          atoms: [
            { id: 'A', calls: [{ target: 'B' }] },
            { id: 'B', calls: [] }
          ]
        }
      }
    };
    expect(analyzer.getAtomCallers('B', project)).toContain('A');
    expect(analyzer.findEntryPoints('B', project)).toContain('A');
    expect(analyzer.canRunConcurrently({ atom: 'A', isAsync: true }, { atom: 'B', isAsync: true }, project)).toBe(true);
    analyzer.clearCache();
    expect(analyzer.cache.size).toBe(0);
  });
});

