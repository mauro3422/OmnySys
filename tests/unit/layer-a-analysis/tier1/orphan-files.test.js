/**
 * Tier 1 Analysis: Orphan Files Tests
 * 
 * Tests for findOrphanFiles - detects files with no dependencies
 */

import { describe, it, expect, vi } from 'vitest';
import { findOrphanFiles } from '#layer-a/analyses/tier1/orphan-files.js';
import { 
  createMockSystemMap, 
  createMockFile,
  ScenarioBuilder 
} from '../../../factories/analysis.factory.js';

// Mock path-utils to avoid external dependencies
vi.mock('#layer-c/verification/utils/path-utils.js', () => ({
  classifyFile: (path) => {
    if (path.includes('.test.') || path.includes('__tests__')) {
      return { type: 'test' };
    }
    if (path.includes('.md') || path.includes('docs/')) {
      return { type: 'documentation' };
    }
    if (path.includes('scripts/') || path.includes('bin/')) {
      return { type: 'script' };
    }
    return { type: 'source' };
  }
}));

describe('Tier 1 - Orphan Files Analysis', () => {
  describe('Structure Contract', () => {
    it('MUST return an object with required fields', () => {
      const systemMap = createMockSystemMap();
      const result = findOrphanFiles(systemMap);
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('deadCodeCount');
      expect(Array.isArray(result.files)).toBe(true);
    });

    it('MUST NOT throw on empty system map', () => {
      const systemMap = createMockSystemMap();
      expect(() => findOrphanFiles(systemMap)).not.toThrow();
    });
  });

  describe('Orphan Detection', () => {
    it('should detect file with no dependencies as orphan', () => {
      const systemMap = createMockSystemMap({
        files: {
          'orphan.js': createMockFile('orphan.js', { 
            usedBy: [], 
            dependsOn: [] 
          })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.total).toBe(1);
      expect(result.files[0].file).toBe('orphan.js');
    });

    it('should NOT detect file with incoming dependencies', () => {
      const systemMap = createMockSystemMap({
        files: {
          'util.js': createMockFile('util.js', { 
            usedBy: ['app.js'], 
            dependsOn: [] 
          })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.total).toBe(0);
    });

    it('should NOT detect file with outgoing dependencies', () => {
      const systemMap = createMockSystemMap({
        files: {
          'app.js': createMockFile('app.js', { 
            usedBy: [], 
            dependsOn: ['util.js'] 
          })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.total).toBe(0);
    });

    it('should NOT detect re-exported files (barrel exports)', () => {
      const systemMap = createMockSystemMap({
        files: {
          'helper.js': createMockFile('helper.js', { 
            usedBy: [], 
            dependsOn: [] 
          })
        },
        exportIndex: {
          'index.js': {
            'helper': { type: 'reexport', sourceFile: 'helper.js', sourceName: 'helper' }
          }
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.total).toBe(0);
    });
  });

  describe('File Classification', () => {
    it('should ignore test files', () => {
      const systemMap = createMockSystemMap({
        files: {
          'component.test.js': createMockFile('component.test.js', { 
            usedBy: [], 
            dependsOn: [] 
          })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.total).toBe(0);
    });

    it('should ignore documentation files', () => {
      const systemMap = createMockSystemMap({
        files: {
          'README.md': createMockFile('README.md', { 
            usedBy: [], 
            dependsOn: [] 
          })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.total).toBe(0);
    });

    it('should ignore script files', () => {
      const systemMap = createMockSystemMap({
        files: {
          'scripts/build.js': createMockFile('scripts/build.js', { 
            usedBy: [], 
            dependsOn: [] 
          })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.total).toBe(0);
    });

    it('should detect source code files', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils.js': createMockFile('utils.js', { 
            usedBy: [], 
            dependsOn: [] 
          })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.total).toBe(1);
    });
  });

  describe('Orphan Types', () => {
    it('should classify entry point files correctly', () => {
      const systemMap = createMockSystemMap({
        files: {
          'main.js': createMockFile('main.js', { 
            usedBy: [], 
            dependsOn: [] 
          })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.files[0].type).toBe('ENTRY_POINT');
    });

    it('should classify dead code files correctly', () => {
      const systemMap = createMockSystemMap({
        files: {
          'unused-helper.js': createMockFile('unused-helper.js', { 
            usedBy: [], 
            dependsOn: [] 
          })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.files[0].type).toBe('DEAD_CODE');
    });

    it('should count dead code separately', () => {
      const systemMap = createMockSystemMap({
        files: {
          'main.js': createMockFile('main.js', { usedBy: [], dependsOn: [] }),
          'dead1.js': createMockFile('dead1.js', { usedBy: [], dependsOn: [] }),
          'dead2.js': createMockFile('dead2.js', { usedBy: [], dependsOn: [] })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.total).toBe(3);
      expect(result.deadCodeCount).toBe(2);
    });
  });

  describe('Recommendations', () => {
    it('should include recommendation for entry points', () => {
      const systemMap = createMockSystemMap({
        files: {
          'main.js': createMockFile('main.js', { usedBy: [], dependsOn: [] })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.files[0].recommendation).toContain('entry point');
    });

    it('should include recommendation for dead code', () => {
      const systemMap = createMockSystemMap({
        files: {
          'unused.js': createMockFile('unused.js', { usedBy: [], dependsOn: [] })
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.files[0].recommendation).toContain('removing');
    });

    it('should include function count', () => {
      const systemMap = createMockSystemMap({
        files: {
          'unused.js': createMockFile('unused.js', { usedBy: [], dependsOn: [] })
        },
        functions: {
          'unused.js': [{ name: 'func1' }, { name: 'func2' }]
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.files[0].functions).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files object', () => {
      const systemMap = createMockSystemMap({ files: {} });
      const result = findOrphanFiles(systemMap);
      
      expect(result.total).toBe(0);
      expect(result.files).toHaveLength(0);
    });

    it('should handle missing usedBy/dependsOn fields', () => {
      const systemMap = createMockSystemMap({
        files: {
          'file.js': { path: 'file.js' } // Missing usedBy and dependsOn
        }
      });
      
      const result = findOrphanFiles(systemMap);
      expect(result.total).toBe(1);
    });

    it('should handle null/undefined exportIndex', () => {
      const systemMap = createMockSystemMap({
        files: {
          'file.js': createMockFile('file.js', { usedBy: [], dependsOn: [] })
        },
        exportIndex: null
      });
      
      expect(() => findOrphanFiles(systemMap)).not.toThrow();
    });
  });
});
