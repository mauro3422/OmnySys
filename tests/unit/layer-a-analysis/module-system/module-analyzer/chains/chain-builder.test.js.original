import { describe, it, expect } from 'vitest';
import { ChainBuilder } from '../../../../../../src/layer-a-static/module-system/module-analyzer/chains/chain-builder.js';

describe('module-system/module-analyzer/chains/chain-builder.js', () => {
  it('exports ChainBuilder class', () => {
    expect(typeof ChainBuilder).toBe('function');
  });

  it('builds chain from exported entry function', () => {
    const molecules = [
      { filePath: '/m/a.js', atoms: [{ id: 'a1', name: 'a', isExported: true }] },
      { filePath: '/m/b.js', atoms: [{ id: 'b1', name: 'b' }] }
    ];
    const connections = [{ from: { function: 'a' }, to: { file: 'b.js', function: 'b' } }];
    const out = new ChainBuilder(molecules, connections).build();
    expect(Array.isArray(out)).toBe(true);
  });
});

