import { describe, it, expect } from 'vitest';
import {
  buildExportIndex,
  resolveExportSource,
  findReexportingFiles
} from '#layer-a/graph/builders/export-index.js';
import { GraphBuilder, SystemMapBuilder } from '../../../../factories/graph-test.factory.js';

describe('ExportIndex', () => {
  describe('Structure Contract', () => {
    it('should export all required functions', () => {
      expect(typeof buildExportIndex).toBe('function');
      expect(typeof resolveExportSource).toBe('function');
      expect(typeof findReexportingFiles).toBe('function');
    });

    it('buildExportIndex should return an object', () => {
      const result = buildExportIndex({}, new Set());
      expect(typeof result).toBe('object');
    });

    it('resolveExportSource should return object or null', () => {
      const result = resolveExportSource('foo', 'src/file.js', {});
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('findReexportingFiles should return an array', () => {
      const result = findReexportingFiles('src/source.js', {});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('buildExportIndex', () => {
    it('should return empty object for empty input', () => {
      const result = buildExportIndex({}, new Set());
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should index direct exports', () => {
      const parsedFiles = {
        'src/utils.js': {
          exports: [
            { name: 'helper', type: 'named' },
            { name: 'default', type: 'default' }
          ]
        }
      };
      const allFilePaths = new Set(['src/utils.js']);
      
      const index = buildExportIndex(parsedFiles, allFilePaths);
      
      expect(index).toHaveProperty('src/utils.js');
      expect(index['src/utils.js']).toHaveProperty('helper');
      expect(index['src/utils.js']).toHaveProperty('default');
      expect(index['src/utils.js']['helper'].type).toBe('direct');
    });

    it('should index re-exports', () => {
      const parsedFiles = {
        'src/index.js': {
          exports: [
            { name: 'foo', type: 'reexport', source: './utils', local: 'originalFoo' }
          ]
        },
        'src/utils.js': {
          exports: [{ name: 'originalFoo', type: 'named' }]
        }
      };
      const allFilePaths = new Set(['src/index.js', 'src/utils.js']);
      
      const index = buildExportIndex(parsedFiles, allFilePaths);
      
      expect(index['src/index.js']['foo'].type).toBe('reexport');
      expect(index['src/index.js']['foo'].sourceFile).toBe('src/utils.js');
      expect(index['src/index.js']['foo'].sourceName).toBe('originalFoo');
    });

    it('should skip re-exports to non-existent files', () => {
      const parsedFiles = {
        'src/index.js': {
          exports: [
            { name: 'foo', type: 'reexport', source: './non-existent', local: 'foo' }
          ]
        }
      };
      const allFilePaths = new Set(['src/index.js']); // non-existent.js not included
      
      const index = buildExportIndex(parsedFiles, allFilePaths);
      
      expect(Object.keys(index['src/index.js'])).toHaveLength(0);
    });

    it('should handle files with no exports', () => {
      const parsedFiles = {
        'src/utils.js': { exports: [] },
        'src/helpers.js': {}
      };
      const allFilePaths = new Set(['src/utils.js', 'src/helpers.js']);
      
      const index = buildExportIndex(parsedFiles, allFilePaths);
      
      expect(Object.keys(index)).toHaveLength(0);
    });

    it('should handle mixed export types', () => {
      const parsedFiles = {
        'src/index.js': {
          exports: [
            { name: 'directExport', type: 'named' },
            { name: 'reexported', type: 'reexport', source: './utils', local: 'original' }
          ]
        }
      };
      const allFilePaths = new Set(['src/index.js', 'src/utils.js']);
      
      const index = buildExportIndex(parsedFiles, allFilePaths);
      
      expect(index['src/index.js']['directExport'].type).toBe('direct');
      expect(index['src/index.js']['reexported'].type).toBe('reexport');
    });

    it('should handle barrel exports pattern', () => {
      const parsedFiles = {
        'src/index.js': {
          exports: [
            { name: 'util1', type: 'reexport', source: './utils', local: 'util1' },
            { name: 'util2', type: 'reexport', source: './utils', local: 'util2' },
            { name: 'helper1', type: 'reexport', source: './helpers', local: 'helper1' }
          ]
        },
        'src/utils.js': { exports: [{ name: 'util1' }, { name: 'util2' }] },
        'src/helpers.js': { exports: [{ name: 'helper1' }] }
      };
      const allFilePaths = new Set(['src/index.js', 'src/utils.js', 'src/helpers.js']);
      
      const index = buildExportIndex(parsedFiles, allFilePaths);
      
      expect(Object.keys(index['src/index.js'])).toHaveLength(3);
    });
  });

  describe('resolveExportSource', () => {
    it('should return null for non-existent file', () => {
      const exportIndex = {};
      const result = resolveExportSource('foo', 'src/file.js', exportIndex);
      expect(result).toBeNull();
    });

    it('should return null for non-existent export', () => {
      const exportIndex = {
        'src/file.js': {}
      };
      const result = resolveExportSource('foo', 'src/file.js', exportIndex);
      expect(result).toBeNull();
    });

    it('should return entry for direct export', () => {
      const exportIndex = {
        'src/utils.js': {
          'helper': { type: 'direct', sourceFile: 'src/utils.js', sourceName: 'helper' }
        }
      };
      
      const result = resolveExportSource('helper', 'src/utils.js', exportIndex);
      
      expect(result).toEqual({
        type: 'direct',
        sourceFile: 'src/utils.js',
        sourceName: 'helper'
      });
    });

    it('should resolve re-export chain', () => {
      const exportIndex = {
        'src/index.js': {
          'foo': { type: 'reexport', sourceFile: 'src/utils.js', sourceName: 'originalFoo' }
        },
        'src/utils.js': {
          'originalFoo': { type: 'direct', sourceFile: 'src/utils.js', sourceName: 'originalFoo' }
        }
      };
      
      const result = resolveExportSource('foo', 'src/index.js', exportIndex);
      
      expect(result.type).toBe('direct');
      expect(result.sourceFile).toBe('src/utils.js');
      expect(result.sourceName).toBe('originalFoo');
    });

    it('should resolve multi-level re-export chain', () => {
      const exportIndex = {
        'src/public.js': {
          'api': { type: 'reexport', sourceFile: 'src/index.js', sourceName: 'api' }
        },
        'src/index.js': {
          'api': { type: 'reexport', sourceFile: 'src/core.js', sourceName: 'coreApi' }
        },
        'src/core.js': {
          'coreApi': { type: 'direct', sourceFile: 'src/core.js', sourceName: 'coreApi' }
        }
      };
      
      const result = resolveExportSource('api', 'src/public.js', exportIndex);
      
      expect(result.type).toBe('direct');
      expect(result.sourceFile).toBe('src/core.js');
    });

    it('should respect maxDepth parameter', () => {
      const exportIndex = {
        'a.js': { 'x': { type: 'reexport', sourceFile: 'b.js', sourceName: 'x' } },
        'b.js': { 'x': { type: 'reexport', sourceFile: 'c.js', sourceName: 'x' } },
        'c.js': { 'x': { type: 'reexport', sourceFile: 'd.js', sourceName: 'x' } },
        'd.js': { 'x': { type: 'direct', sourceFile: 'd.js', sourceName: 'x' } }
      };
      
      const result = resolveExportSource('x', 'a.js', exportIndex, 2);
      
      // Should return null because maxDepth (2) is exceeded
      expect(result).toBeNull();
    });

    it('should handle circular re-exports', () => {
      const exportIndex = {
        'a.js': { 'x': { type: 'reexport', sourceFile: 'b.js', sourceName: 'x' } },
        'b.js': { 'x': { type: 'reexport', sourceFile: 'a.js', sourceName: 'x' } }
      };
      
      const result = resolveExportSource('x', 'a.js', exportIndex);
      
      // Should return null due to maxDepth or cycle detection
      expect(result).toBeNull();
    });
  });

  describe('findReexportingFiles', () => {
    it('should return empty array for empty index', () => {
      const result = findReexportingFiles('src/source.js', {});
      expect(result).toHaveLength(0);
    });

    it('should find files that re-export from source', () => {
      const exportIndex = {
        'src/index.js': {
          'foo': { type: 'reexport', sourceFile: 'src/utils.js', sourceName: 'originalFoo' },
          'bar': { type: 'reexport', sourceFile: 'src/utils.js', sourceName: 'originalBar' }
        },
        'src/other.js': {
          'baz': { type: 'reexport', sourceFile: 'src/utils.js', sourceName: 'originalBaz' }
        }
      };
      
      const result = findReexportingFiles('src/utils.js', exportIndex);
      
      expect(result).toHaveLength(2);
      expect(result.map(r => r.file)).toContain('src/index.js');
      expect(result.map(r => r.file)).toContain('src/other.js');
    });

    it('should list re-exported names for each file', () => {
      const exportIndex = {
        'src/index.js': {
          'foo': { type: 'reexport', sourceFile: 'src/utils.js', sourceName: 'originalFoo' },
          'bar': { type: 'reexport', sourceFile: 'src/utils.js', sourceName: 'originalBar' }
        }
      };
      
      const result = findReexportingFiles('src/utils.js', exportIndex);
      
      expect(result[0].exports).toContain('foo');
      expect(result[0].exports).toContain('bar');
    });

    it('should not include direct exports', () => {
      const exportIndex = {
        'src/utils.js': {
          'foo': { type: 'direct', sourceFile: 'src/utils.js', sourceName: 'foo' }
        }
      };
      
      const result = findReexportingFiles('src/utils.js', exportIndex);
      
      expect(result).toHaveLength(0);
    });

    it('should not include re-exports from other sources', () => {
      const exportIndex = {
        'src/index.js': {
          'foo': { type: 'reexport', sourceFile: 'src/other.js', sourceName: 'foo' }
        }
      };
      
      const result = findReexportingFiles('src/utils.js', exportIndex);
      
      expect(result).toHaveLength(0);
    });

    it('should handle complex export index', () => {
      const exportIndex = {
        'src/index.js': {
          'a': { type: 'reexport', sourceFile: 'src/core.js' },
          'b': { type: 'reexport', sourceFile: 'src/core.js' }
        },
        'src/public.js': {
          'c': { type: 'reexport', sourceFile: 'src/core.js' }
        },
        'src/core.js': {
          'a': { type: 'direct', sourceFile: 'src/core.js' },
          'b': { type: 'direct', sourceFile: 'src/core.js' },
          'c': { type: 'direct', sourceFile: 'src/core.js' }
        }
      };
      
      const result = findReexportingFiles('src/core.js', exportIndex);
      
      expect(result).toHaveLength(2);
      const indexFile = result.find(r => r.file === 'src/index.js');
      expect(indexFile.exports).toHaveLength(2);
    });
  });

  describe('Error Handling Contract', () => {
    it('buildExportIndex should handle null parsedFiles', () => {
      expect(() => buildExportIndex(null, new Set())).not.toThrow();
    });

    it('buildExportIndex should handle null allFilePaths', () => {
      expect(() => buildExportIndex({}, null)).not.toThrow();
    });

    it('resolveExportSource should handle null exportIndex', () => {
      const result = resolveExportSource('foo', 'file.js', null);
      expect(result).toBeNull();
    });

    it('resolveExportSource should handle undefined file in index', () => {
      const exportIndex = { 'other.js': {} };
      const result = resolveExportSource('foo', 'file.js', exportIndex);
      expect(result).toBeNull();
    });

    it('findReexportingFiles should handle null exportIndex', () => {
      const result = findReexportingFiles('source.js', null);
      expect(result).toEqual([]);
    });

    it('should handle exports with missing properties', () => {
      const parsedFiles = {
        'src/file.js': {
          exports: [
            { name: 'incomplete', type: 'reexport' } // Missing source and local
          ]
        }
      };
      const allFilePaths = new Set(['src/file.js']);
      
      expect(() => buildExportIndex(parsedFiles, allFilePaths)).not.toThrow();
    });
  });

  describe('Integration with SystemMapBuilder', () => {
    it('should build export index with SystemMapBuilder', () => {
      const systemMap = SystemMapBuilder.create()
        .withParsedFile('src/utils.js', {
          exports: [
            { name: 'helper', type: 'named' },
            { name: 'format', type: 'reexport', source: './format', local: 'formatDate' }
          ]
        })
        .withParsedFile('src/format.js', {
          exports: [{ name: 'formatDate', type: 'named' }]
        })
        .build();
      
      expect(systemMap.exportIndex).toBeDefined();
    });

    it('should correctly resolve exports in complex system', () => {
      const parsedFiles = {
        'src/index.js': {
          exports: [
            { name: 'utils', type: 'reexport', source: './utils', local: 'utils' }
          ]
        },
        'src/utils.js': {
          exports: [
            { name: 'helper', type: 'named' },
            { name: 'format', type: 'named' }
          ]
        }
      };
      const allFilePaths = new Set(['src/index.js', 'src/utils.js']);
      
      const index = buildExportIndex(parsedFiles, allFilePaths);
      
      const source = resolveExportSource('utils', 'src/index.js', index);
      expect(source).toBeNull(); // utils is a re-export but doesn't have direct entry
    });
  });
});
