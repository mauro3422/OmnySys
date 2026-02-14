/**
 * Tier 1 Analysis: Unused Exports Tests
 * 
 * Tests for findUnusedExports - detects exports that are never imported
 */

import { describe, it, expect, vi } from 'vitest';
import { findUnusedExports } from '#layer-a/analyses/tier1/unused-exports.js';
import { 
  createMockSystemMap, 
  createMockFile,
  createMockFunction,
  createMockFunctionLink 
} from '../../../factories/analysis.factory.js';

// Mock path-utils and helpers
vi.mock('#layer-c/verification/utils/path-utils.js', () => ({
  classifyFile: (path) => {
    if (path.includes('.test.')) return { type: 'test' };
    if (path.includes('.md')) return { type: 'documentation' };
    if (path.includes('scripts/')) return { type: 'script' };
    return { type: 'source' };
  }
}));

vi.mock('#layer-a/analyses/helpers.js', () => ({
  isPublicAPI: (filePath, exportName) => {
    // Mock: indexProject from indexer.js is public API
    return filePath.includes('indexer.js') && exportName === 'indexProject';
  }
}));

describe('Tier 1 - Unused Exports Analysis', () => {
  describe('Structure Contract', () => {
    it('MUST return an object with required fields', () => {
      const systemMap = createMockSystemMap();
      const result = findUnusedExports(systemMap);
      
      expect(result).toHaveProperty('totalUnused');
      expect(result).toHaveProperty('byFile');
      expect(result).toHaveProperty('impact');
      expect(typeof result.byFile).toBe('object');
    });

    it('MUST NOT throw on empty system map', () => {
      const systemMap = createMockSystemMap();
      expect(() => findUnusedExports(systemMap)).not.toThrow();
    });

    it('should return zero unused exports for empty project', () => {
      const systemMap = createMockSystemMap();
      const result = findUnusedExports(systemMap);
      
      expect(result.totalUnused).toBe(0);
      expect(Object.keys(result.byFile)).toHaveLength(0);
    });
  });

  describe('Unused Export Detection', () => {
    it('should detect exported function that is never called', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils.js': createMockFile('utils.js', {
            imports: [],
            exports: ['helper']
          })
        },
        functions: {
          'utils.js': [createMockFunction('utils.js', 'helper', { isExported: true })]
        },
        function_links: [] // No calls
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.totalUnused).toBe(1);
      expect(result.byFile['utils.js']).toHaveLength(1);
      expect(result.byFile['utils.js'][0].name).toBe('helper');
    });

    it('should NOT detect exported function that IS called', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils.js': createMockFile('utils.js', { imports: [], exports: ['helper'] }),
          'app.js': createMockFile('app.js', { 
            imports: [{ source: './utils', specifiers: [{ imported: 'helper' }] }],
            exports: []
          })
        },
        functions: {
          'utils.js': [createMockFunction('utils.js', 'helper', { isExported: true })]
        },
        function_links: [
          createMockFunctionLink('app.js:main', 'utils.js:helper')
        ]
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.totalUnused).toBe(0);
    });

    it('should NOT detect exports marked as public API', () => {
      const systemMap = createMockSystemMap({
        files: {
          'indexer.js': createMockFile('indexer.js', { imports: [], exports: ['indexProject'] })
        },
        functions: {
          'indexer.js': [createMockFunction('indexer.js', 'indexProject', { isExported: true })]
        },
        function_links: []
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.totalUnused).toBe(0);
    });

    it('should NOT detect exports from test files', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils.test.js': createMockFile('utils.test.js', { imports: [], exports: ['testHelper'] })
        },
        functions: {
          'utils.test.js': [createMockFunction('utils.test.js', 'testHelper', { isExported: true })]
        },
        function_links: []
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.totalUnused).toBe(0);
    });

    it('should NOT detect exports from script files', () => {
      const systemMap = createMockSystemMap({
        files: {
          'scripts/build.js': createMockFile('scripts/build.js', { imports: [], exports: ['build'] })
        },
        functions: {
          'scripts/build.js': [createMockFunction('scripts/build.js', 'build', { isExported: true })]
        },
        function_links: []
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.totalUnused).toBe(0);
    });
  });

  describe('Barrel Export Detection', () => {
    it('should NOT detect re-exported functions as unused', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils/helper.js': createMockFile('utils/helper.js', { imports: [], exports: ['helper'] })
        },
        functions: {
          'utils/helper.js': [createMockFunction('utils/helper.js', 'helper', { isExported: true })]
        },
        exportIndex: {
          'utils/index.js': {
            'helper': { 
              type: 'reexport', 
              sourceFile: 'utils/helper.js', 
              sourceName: 'helper' 
            }
          }
        },
        function_links: []
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.totalUnused).toBe(0);
    });

    it('should detect unused exports even when barrel exists for others', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils/helpers.js': createMockFile('utils/helpers.js', { imports: [], exports: ['used', 'unused'] })
        },
        functions: {
          'utils/helpers.js': [
            createMockFunction('utils/helpers.js', 'used', { isExported: true }),
            createMockFunction('utils/helpers.js', 'unused', { isExported: true })
          ]
        },
        exportIndex: {
          'utils/index.js': {
            'used': { type: 'reexport', sourceFile: 'utils/helpers.js', sourceName: 'used' }
          }
        },
        function_links: []
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.totalUnused).toBe(1);
      expect(result.byFile['utils/helpers.js'][0].name).toBe('unused');
    });
  });

  describe('Direct Import Detection', () => {
    it('should mark export as used when imported directly', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils.js': createMockFile('utils.js', { imports: [], exports: ['helper'] }),
          'app.js': createMockFile('app.js', {
            imports: [{
              source: './utils',
              resolved: 'utils.js',
              specifiers: [{ imported: 'helper', local: 'helper' }]
            }],
            exports: []
          })
        },
        functions: {
          'utils.js': [createMockFunction('utils.js', 'helper', { isExported: true })]
        },
        function_links: []
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.totalUnused).toBe(0);
    });
  });

  describe('Result Format', () => {
    it('should group unused exports by file', () => {
      const systemMap = createMockSystemMap({
        files: {
          'a.js': createMockFile('a.js', { imports: [], exports: ['a1', 'a2'] }),
          'b.js': createMockFile('b.js', { imports: [], exports: ['b1'] })
        },
        functions: {
          'a.js': [
            createMockFunction('a.js', 'a1', { isExported: true }),
            createMockFunction('a.js', 'a2', { isExported: true })
          ],
          'b.js': [createMockFunction('b.js', 'b1', { isExported: true })]
        },
        function_links: []
      });
      
      const result = findUnusedExports(systemMap);
      expect(Object.keys(result.byFile)).toHaveLength(2);
      expect(result.byFile['a.js']).toHaveLength(2);
      expect(result.byFile['b.js']).toHaveLength(1);
    });

    it('should include line number and severity for each unused export', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils.js': createMockFile('utils.js', { imports: [], exports: ['helper'] })
        },
        functions: {
          'utils.js': [createMockFunction('utils.js', 'helper', { isExported: true, line: 42 })]
        },
        function_links: []
      });
      
      const result = findUnusedExports(systemMap);
      const unused = result.byFile['utils.js'][0];
      expect(unused.line).toBe(42);
      expect(unused.severity).toBe('warning');
    });

    it('should include impact message', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils.js': createMockFile('utils.js', { imports: [], exports: ['h1', 'h2'] })
        },
        functions: {
          'utils.js': [
            createMockFunction('utils.js', 'h1', { isExported: true }),
            createMockFunction('utils.js', 'h2', { isExported: true })
          ]
        },
        function_links: []
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.impact).toContain('2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-exported functions', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils.js': createMockFile('utils.js', { imports: [], exports: [] })
        },
        functions: {
          'utils.js': [createMockFunction('utils.js', 'internalFunc', { isExported: false })]
        },
        function_links: []
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.totalUnused).toBe(0);
    });

    it('should handle missing functions array', () => {
      const systemMap = createMockSystemMap({
        files: {
          'utils.js': createMockFile('utils.js', { imports: [], exports: ['helper'] })
        },
        functions: {} // Missing file entry
      });
      
      const result = findUnusedExports(systemMap);
      expect(result.totalUnused).toBe(0);
    });

    it('should handle specifiers without imported field', () => {
      const systemMap = createMockSystemMap({
        files: {
          'app.js': createMockFile('app.js', {
            imports: [{
              source: './utils',
              specifiers: [{ local: 'alias' }] // Missing 'imported'
            }]
          })
        }
      });
      
      expect(() => findUnusedExports(systemMap)).not.toThrow();
    });
  });
});
