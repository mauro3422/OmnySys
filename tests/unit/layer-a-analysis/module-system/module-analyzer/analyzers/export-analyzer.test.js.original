import { describe, it, expect } from 'vitest';
import { ExportAnalyzer } from '../../../../../../src/layer-a-static/module-system/module-analyzer/analyzers/export-analyzer.js';

describe('module-system/module-analyzer/analyzers/export-analyzer.js', () => {
  it('exports ExportAnalyzer class', () => {
    expect(typeof ExportAnalyzer).toBe('function');
  });

  it('collects only exported atoms', () => {
    const out = new ExportAnalyzer([
      { filePath: '/m/a.js', atoms: [{ name: 'x', isExported: true }, { name: 'y', isExported: false }] }
    ]).analyze();
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('x');
  });
});

