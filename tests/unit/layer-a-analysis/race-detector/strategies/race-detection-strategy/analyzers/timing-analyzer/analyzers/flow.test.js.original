import { describe, it, expect } from 'vitest';
import { sameBusinessFlow, sameEntryPoint } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/flow.js';

describe('race-detector/.../timing-analyzer/analyzers/flow.js', () => {
  const project = {
    modules: [{
      files: [{
        filePath: 'src/file.js',
        atoms: [{
          id: 'src/file.js::Caller',
          code: 'const r1 = await fn1();\nconst r2 = await fn2(r1);',
          calls: []
        }]
      }]
    }]
  };

  const analyzer = {
    getAtomCallers(atom) {
      if (atom.endsWith('fn1') || atom.endsWith('fn2')) return ['src/file.js::Caller'];
      return [];
    },
    findEntryPoints() {
      return ['src/file.js::EntryPoint'];
    },
    findAtomById(id) {
      return project.modules[0].files[0].atoms.find(a => a.id === id) || null;
    }
  };

  it('detects same flow for shared callers and same entry points', () => {
    const a1 = { atom: 'src/file.js::fn1', file: 'src/file.js', caller: 'Caller', isAsync: true, module: 'm', isExported: true };
    const a2 = { atom: 'src/file.js::fn2', file: 'src/file.js', caller: 'Caller', isAsync: true, module: 'm', isExported: true };

    expect(sameBusinessFlow(a1, a2, project, analyzer)).toBe(true);
    expect(sameEntryPoint(a1, a2, project, analyzer)).toBe(true);
  });
});

