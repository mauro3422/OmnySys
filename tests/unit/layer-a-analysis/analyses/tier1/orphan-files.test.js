import { describe, it, expect } from 'vitest';
import { findOrphanFiles } from '#layer-a/analyses/tier1/orphan-files.js';

describe('analyses/tier1/orphan-files.js', () => {
  it('handles null/undefined systemMap gracefully', () => {
    expect(findOrphanFiles(null)).toEqual({ total: 0, files: [], deadCodeCount: 0 });
  });

  it('flags isolated files as dead code when they are not entry points', () => {
    const systemMap = {
      files: {
        'src/feature/utils.js': { usedBy: [], dependsOn: [] }
      },
      exportIndex: {},
      functions: {
        'src/feature/utils.js': [{ name: 'helper' }]
      }
    };
    const out = findOrphanFiles(systemMap);
    expect(out.total).toBe(1);
    expect(out.files[0].type).toBe('DEAD_CODE');
  });
});

