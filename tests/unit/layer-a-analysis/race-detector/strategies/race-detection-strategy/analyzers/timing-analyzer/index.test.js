import { describe, it, expect } from 'vitest';
import TimingAnalyzerDefault, { TimingAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/index.js';

describe('race-detector/.../timing-analyzer/index.js', () => {
  it('exports TimingAnalyzer class as default', () => {
    expect(TimingAnalyzer).toBeTypeOf('function');
    expect(TimingAnalyzerDefault).toBe(TimingAnalyzer);
  });

  it('delegates core timing methods through composed functions', () => {
    const analyzer = new TimingAnalyzer();
    const project = {
      modules: [{
        files: [{
          filePath: 'src/x.js',
          atoms: [
            { id: 'src/x.js::Main', name: 'Main', calls: [{ name: 'a' }, { name: 'b' }], code: 'await a();\nawait b();' },
            { id: 'src/x.js::a', name: 'a', calls: [] },
            { id: 'src/x.js::b', name: 'b', calls: [] }
          ]
        }]
      }]
    };
    const r = analyzer.analyzeTiming([
      { atom: 'src/x.js::a', isAsync: true, file: 'src/x.js', caller: 'Main', module: 'm', isExported: true },
      { atom: 'src/x.js::b', isAsync: true, file: 'src/x.js', caller: 'Main', module: 'm', isExported: true }
    ], project);
    expect(r).toHaveProperty('totalAccesses', 2);
  });
});

