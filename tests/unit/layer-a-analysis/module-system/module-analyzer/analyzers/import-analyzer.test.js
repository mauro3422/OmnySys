import { describe, it, expect } from 'vitest';
import { ImportAnalyzer } from '../../../../../../src/layer-a-static/module-system/module-analyzer/analyzers/import-analyzer.js';

describe('module-system/module-analyzer/analyzers/import-analyzer.js', () => {
  it('exports ImportAnalyzer class', () => {
    expect(typeof ImportAnalyzer).toBe('function');
  });

  it('collects external imports grouped by inferred module', () => {
    const out = new ImportAnalyzer([
      { atoms: [{ calls: [{ type: 'external', name: 'db.query' }, { type: 'external', name: 'logger.info' }] }] }
    ], 'auth').analyze();
    expect(out.map((x) => x.module)).toEqual(expect.arrayContaining(['database', 'logger']));
  });
});

