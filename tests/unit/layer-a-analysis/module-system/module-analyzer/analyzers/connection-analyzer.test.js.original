import { describe, it, expect } from 'vitest';
import { ConnectionAnalyzer } from '../../../../../../src/layer-a-static/module-system/module-analyzer/analyzers/connection-analyzer.js';

describe('module-system/module-analyzer/analyzers/connection-analyzer.js', () => {
  it('exports ConnectionAnalyzer class', () => {
    expect(typeof ConnectionAnalyzer).toBe('function');
  });

  it('analyzes cross-file function calls', () => {
    const analyzer = new ConnectionAnalyzer([
      { filePath: '/m/a.js', atoms: [{ id: 'a1', name: 'a', calls: [{ name: 'b', args: [], type: 'internal' }] }] },
      { filePath: '/m/b.js', atoms: [{ id: 'b1', name: 'b', dataFlow: { inputs: [] } }] }
    ]);
    const out = analyzer.analyze();
    expect(out).toHaveLength(1);
    expect(out[0].from.file).toBe('a.js');
    expect(out[0].to.file).toBe('b.js');
  });
});

