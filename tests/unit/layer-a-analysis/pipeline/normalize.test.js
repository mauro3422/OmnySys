/**
 * @fileoverview Normalize Tests
 * 
 * Tests for normalize.js - Data normalization utilities
 * 
 * @module tests/unit/layer-a-analysis/pipeline/normalize
 */

import { describe, it, expect } from 'vitest';
import { normalizeParsedFiles, normalizeResolvedImports } from '#layer-a/pipeline/normalize.js';

describe('Normalize Module', () => {
  describe('Structure Contract', () => {
    it('should export normalizeParsedFiles function', () => {
      expect(normalizeParsedFiles).toBeDefined();
      expect(typeof normalizeParsedFiles).toBe('function');
    });

    it('should export normalizeResolvedImports function', () => {
      expect(normalizeResolvedImports).toBeDefined();
      expect(typeof normalizeResolvedImports).toBe('function');
    });
  });

  describe('normalizeParsedFiles', () => {
    it('should convert absolute paths to relative paths', () => {
      const parsedFiles = {
        'C:/projects/test/src/file.js': { imports: [], exports: [] },
        'C:/projects/test/src/utils.js': { imports: [], exports: [] }
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/projects/test');

      expect(result).toHaveProperty('src/file.js');
      expect(result).toHaveProperty('src/utils.js');
    });

    it('should preserve file content', () => {
      const fileInfo = { imports: [{ source: './dep.js' }], exports: ['default'] };
      const parsedFiles = {
        'C:/projects/test/src/file.js': fileInfo
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/projects/test');

      expect(result['src/file.js']).toBe(fileInfo);
    });

    it('should convert backslashes to forward slashes', () => {
      const parsedFiles = {
        'C:\\projects\\test\\src\\file.js': { imports: [], exports: [] }
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/projects/test');

      expect(Object.keys(result)[0]).toBe('src/file.js');
    });

    it('should handle nested directory structures', () => {
      const parsedFiles = {
        'C:/projects/test/src/components/ui/Button.js': {},
        'C:/projects/test/src/hooks/useAuth.js': {}
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/projects/test');

      expect(result).toHaveProperty('src/components/ui/Button.js');
      expect(result).toHaveProperty('src/hooks/useAuth.js');
    });

    it('should handle empty parsed files', () => {
      const result = normalizeParsedFiles({}, 'C:/projects/test');

      expect(result).toEqual({});
    });

    it('should handle files at root level', () => {
      const parsedFiles = {
        'C:/projects/test/package.json': {}
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/projects/test');

      expect(result).toHaveProperty('package.json');
    });

    it('should preserve all file properties', () => {
      const fileInfo = {
        imports: [{ source: './a.js' }],
        exports: ['default', 'named'],
        definitions: [{ name: 'func1', type: 'function' }],
        source: 'export function func1() {}'
      };
      const parsedFiles = {
        'C:/projects/test/src/file.js': fileInfo
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/projects/test');

      expect(result['src/file.js']).toEqual(fileInfo);
    });
  });

  describe('normalizeResolvedImports', () => {
    it('should convert absolute paths to relative paths', () => {
      const resolvedImports = {
        'C:/projects/test/src/file.js': [{ source: './a.js', resolved: 'src/a.js' }]
      };

      const result = normalizeResolvedImports(resolvedImports, 'C:/projects/test');

      expect(result).toHaveProperty('src/file.js');
    });

    it('should preserve import data', () => {
      const imports = [
        { source: './a.js', resolved: 'src/a.js', type: 'local' },
        { source: 'react', type: 'external' }
      ];
      const resolvedImports = {
        'C:/projects/test/src/file.js': imports
      };

      const result = normalizeResolvedImports(resolvedImports, 'C:/projects/test');

      expect(result['src/file.js']).toBe(imports);
    });

    it('should convert backslashes to forward slashes', () => {
      const resolvedImports = {
        'C:\\projects\\test\\src\\file.js': []
      };

      const result = normalizeResolvedImports(resolvedImports, 'C:/projects/test');

      expect(Object.keys(result)[0]).toBe('src/file.js');
    });

    it('should handle multiple files with imports', () => {
      const resolvedImports = {
        'C:/projects/test/src/a.js': [{ source: './b.js' }],
        'C:/projects/test/src/b.js': [{ source: './c.js' }],
        'C:/projects/test/src/c.js': []
      };

      const result = normalizeResolvedImports(resolvedImports, 'C:/projects/test');

      expect(Object.keys(result)).toHaveLength(3);
      expect(result['src/a.js']).toHaveLength(1);
      expect(result['src/b.js']).toHaveLength(1);
      expect(result['src/c.js']).toHaveLength(0);
    });

    it('should handle empty resolved imports', () => {
      const result = normalizeResolvedImports({}, 'C:/projects/test');

      expect(result).toEqual({});
    });

    it('should handle files with empty import arrays', () => {
      const resolvedImports = {
        'C:/projects/test/src/file.js': []
      };

      const result = normalizeResolvedImports(resolvedImports, 'C:/projects/test');

      expect(result['src/file.js']).toEqual([]);
    });

    it('should preserve import metadata', () => {
      const imports = [{
        source: './utils.js',
        resolved: 'src/utils.js',
        type: 'local',
        symbols: ['helper', 'format'],
        reason: 'resolved'
      }];
      const resolvedImports = {
        'C:/projects/test/src/file.js': imports
      };

      const result = normalizeResolvedImports(resolvedImports, 'C:/projects/test');

      expect(result['src/file.js'][0]).toEqual(imports[0]);
    });
  });

  describe('Cross-platform Path Handling', () => {
    it('should handle Windows-style absolute paths', () => {
      const parsedFiles = {
        'C:\\Users\\test\\project\\src\\file.js': {}
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/Users/test/project');

      expect(Object.keys(result)[0]).not.toContain('\\');
    });

    it('should handle Unix-style absolute paths', () => {
      const parsedFiles = {
        '/home/test/project/src/file.js': {}
      };

      const result = normalizeParsedFiles(parsedFiles, '/home/test/project');

      expect(result).toHaveProperty('src/file.js');
    });

    it('should handle mixed path separators', () => {
      const parsedFiles = {
        'C:/projects\\test/src\\file.js': {}
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/projects/test');

      expect(Object.keys(result)[0]).toBe('src/file.js');
    });
  });

  describe('Edge Cases', () => {
    it('should handle paths outside root (with ..)', () => {
      const parsedFiles = {
        'C:/projects/other/file.js': {}
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/projects/test');

      // Path.relative will include ..
      expect(Object.keys(result)[0]).toContain('..');
    });

    it('should handle identical paths', () => {
      const parsedFiles = {
        'C:/projects/test': {}
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/projects/test');

      expect(Object.keys(result)[0]).toBe('');
    });

    it('should handle very deep nesting', () => {
      const parsedFiles = {
        'C:/projects/test/a/b/c/d/e/f/g/h/i/j/file.js': {}
      };

      const result = normalizeParsedFiles(parsedFiles, 'C:/projects/test');

      expect(result).toHaveProperty('a/b/c/d/e/f/g/h/i/j/file.js');
    });
  });
});
