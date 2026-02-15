import { describe, it, expect } from 'vitest';
import { ModuleAnalyzer } from '../../../../../src/layer-a-static/module-system/module-analyzer/ModuleAnalyzer.js';

describe('module-system/module-analyzer/ModuleAnalyzer.js', () => {
  it('exports ModuleAnalyzer class', () => {
    expect(typeof ModuleAnalyzer).toBe('function');
  });

  it('returns full module analysis structure', () => {
    const analyzer = new ModuleAnalyzer('/project/src/auth', [
      {
        filePath: '/project/src/auth/login.js',
        atomCount: 1,
        atoms: [{ id: 'a1', name: 'login', isExported: true, hasSideEffects: false, calls: [] }]
      }
    ]);
    const out = analyzer.analyze();
    expect(out).toHaveProperty('crossFileConnections');
    expect(out).toHaveProperty('exports');
    expect(out).toHaveProperty('imports');
    expect(out).toHaveProperty('internalChains');
    expect(out).toHaveProperty('metrics');
  });
});

