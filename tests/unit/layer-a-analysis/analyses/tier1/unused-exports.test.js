import { describe, it, expect } from 'vitest';
import { findUnusedExports } from '#layer-a/analyses/tier1/unused-exports.js';

describe('analyses/tier1/unused-exports.js', () => {
  it('handles null/undefined systemMap gracefully', () => {
    const out = findUnusedExports(null);
    expect(out.totalUnused).toBe(0);
    expect(out.byFile).toEqual({});
  });

  it('reports unused exports when they are not used/public/script exports', () => {
    const filePath = 'src/layer-a-static/internal-module.js';
    const systemMap = {
      function_links: [],
      exportIndex: {},
      files: {
        [filePath]: { imports: [] }
      },
      functions: {
        [filePath]: [{ id: `${filePath}::hiddenFn`, name: 'hiddenFn', line: 1, isExported: true }]
      }
    };
    const out = findUnusedExports(systemMap);
    expect(out.totalUnused).toBe(1);
    expect(out.byFile[filePath][0].name).toBe('hiddenFn');
  });
});

