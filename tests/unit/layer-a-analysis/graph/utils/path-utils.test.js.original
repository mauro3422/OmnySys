import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  getDisplayPath,
  resolveImportPath,
  uniquePaths,
  pathsEqual,
  getFileExtension,
  isRelativePath
} from '#layer-a/graph/utils/path-utils.js';

describe('Path Utils', () => {
  describe('Structure Contract', () => {
    it('should export all required functions', () => {
      expect(typeof normalizePath).toBe('function');
      expect(typeof getDisplayPath).toBe('function');
      expect(typeof resolveImportPath).toBe('function');
      expect(typeof uniquePaths).toBe('function');
      expect(typeof pathsEqual).toBe('function');
      expect(typeof getFileExtension).toBe('function');
      expect(typeof isRelativePath).toBe('function');
    });
  });

  describe('normalizePath', () => {
    it('should convert Windows paths to Unix format', () => {
      expect(normalizePath('src\\utils\\helpers.js')).toBe('src/utils/helpers.js');
    });

    it('should handle mixed separators', () => {
      expect(normalizePath('src\\utils/helpers.js')).toBe('src/utils/helpers.js');
    });

    it('should keep Unix paths unchanged', () => {
      expect(normalizePath('src/utils/helpers.js')).toBe('src/utils/helpers.js');
    });

    it('should handle absolute Windows paths', () => {
      const result = normalizePath('C:\\Users\\test\\project\\src\\file.js');
      expect(result).toBe('C:/Users/test/project/src/file.js');
    });

    it('should handle paths with dots', () => {
      expect(normalizePath('.\\src\\utils.js')).toBe('src/utils.js');
      expect(normalizePath('..\\..\\src\\utils.js')).toBe('../../src/utils.js');
    });

    it('should handle empty string', () => {
      expect(normalizePath('')).toBe('.');
    });

    it('should normalize redundant separators', () => {
      expect(normalizePath('src//utils//file.js')).toBe('src/utils/file.js');
    });
  });

  describe('getDisplayPath', () => {
    it('should extract path from src/ when present', () => {
      expect(getDisplayPath('/home/user/project/src/utils/helpers.js')).toBe('src/utils/helpers.js');
    });

    it('should handle Windows-style src path', () => {
      expect(getDisplayPath('C:/project/src/components/Button.js')).toBe('src/components/Button.js');
    });

    it('should return filename only when no src/', () => {
      expect(getDisplayPath('/home/user/project/lib/helpers.js')).toBe('helpers.js');
    });

    it('should handle file at root', () => {
      expect(getDisplayPath('file.js')).toBe('file.js');
    });

    it('should handle empty string', () => {
      expect(getDisplayPath('')).toBe('');
    });

    it('should handle path ending with /src/', () => {
      expect(getDisplayPath('/project/src/')).toBe('src/');
    });

    it('should handle multiple src occurrences', () => {
      expect(getDisplayPath('/src/project/src/utils.js')).toBe('src/project/src/utils.js');
    });
  });

  describe('resolveImportPath', () => {
    it('should resolve relative imports', () => {
      const result = resolveImportPath('/src/components/Button.js', './utils');
      expect(result).toBe('/src/components/utils.js');
    });

    it('should resolve parent directory imports', () => {
      const result = resolveImportPath('/src/components/Button.js', '../utils');
      expect(result).toBe('/src/utils.js');
    });

    it('should add .js extension if missing', () => {
      const result = resolveImportPath('/src/index.js', './config');
      expect(result).toBe('/src/config.js');
    });

    it('should keep existing extension', () => {
      const result = resolveImportPath('/src/index.js', './styles.css');
      expect(result).toBe('/src/styles.css');
    });

    it('should handle custom extension', () => {
      const result = resolveImportPath('/src/index.js', './config', '.json');
      expect(result).toBe('/src/config.json');
    });

    it('should handle deep relative paths', () => {
      const result = resolveImportPath('/src/a/b/c/d.js', '../../../x');
      expect(result).toBe('/src/x.js');
    });

    it('should normalize separators in result', () => {
      const result = resolveImportPath('/src\\components\\Button.js', './utils');
      expect(result).toBe('/src/components/utils.js');
    });
  });

  describe('uniquePaths', () => {
    it('should remove duplicates', () => {
      const paths = ['/src/a.js', '/src/b.js', '/src/a.js'];
      expect(uniquePaths(paths)).toEqual(['/src/a.js', '/src/b.js']);
    });

    it('should sort paths', () => {
      const paths = ['/src/z.js', '/src/a.js', '/src/m.js'];
      expect(uniquePaths(paths)).toEqual(['/src/a.js', '/src/m.js', '/src/z.js']);
    });

    it('should handle empty array', () => {
      expect(uniquePaths([])).toEqual([]);
    });

    it('should handle single path', () => {
      expect(uniquePaths(['/src/a.js'])).toEqual(['/src/a.js']);
    });

    it('should handle all duplicates', () => {
      const paths = ['/src/a.js', '/src/a.js', '/src/a.js'];
      expect(uniquePaths(paths)).toEqual(['/src/a.js']);
    });
  });

  describe('pathsEqual', () => {
    it('should return true for equal paths', () => {
      expect(pathsEqual('/src/a.js', '/src/a.js')).toBe(true);
    });

    it('should return false for different paths', () => {
      expect(pathsEqual('/src/a.js', '/src/b.js')).toBe(false);
    });

    it('should normalize before comparing', () => {
      expect(pathsEqual('src\\a.js', 'src/a.js')).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(pathsEqual('', '')).toBe(true);
    });

    it('should handle case sensitivity', () => {
      expect(pathsEqual('/SRC/A.JS', '/src/a.js')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should return lowercase extension', () => {
      expect(getFileExtension('file.JS')).toBe('.js');
    });

    it('should return extension for standard files', () => {
      expect(getFileExtension('file.js')).toBe('.js');
      expect(getFileExtension('file.ts')).toBe('.ts');
      expect(getFileExtension('file.json')).toBe('.json');
    });

    it('should handle files with dots in name', () => {
      expect(getFileExtension('some.file.name.js')).toBe('.js');
    });

    it('should return empty string for no extension', () => {
      expect(getFileExtension('Makefile')).toBe('');
    });

    it('should handle empty string', () => {
      expect(getFileExtension('')).toBe('');
    });

    it('should handle dot files', () => {
      expect(getFileExtension('.gitignore')).toBe('');
    });

    it('should handle paths', () => {
      expect(getFileExtension('/src/utils/helpers.js')).toBe('.js');
    });
  });

  describe('isRelativePath', () => {
    it('should return true for ./ paths', () => {
      expect(isRelativePath('./file.js')).toBe(true);
      expect(isRelativePath('./utils/helpers')).toBe(true);
    });

    it('should return true for ../ paths', () => {
      expect(isRelativePath('../file.js')).toBe(true);
      expect(isRelativePath('../../utils/helpers')).toBe(true);
    });

    it('should return false for absolute paths', () => {
      expect(isRelativePath('/src/file.js')).toBe(false);
    });

    it('should return false for package imports', () => {
      expect(isRelativePath('lodash')).toBe(false);
      expect(isRelativePath('react-dom')).toBe(false);
      expect(isRelativePath('@scope/package')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(isRelativePath('')).toBe(false);
    });

    it('should handle single dot', () => {
      expect(isRelativePath('.')).toBe(false);
    });

    it('should handle double dot', () => {
      expect(isRelativePath('..')).toBe(false);
    });
  });

  describe('Error Handling Contract', () => {
    it('normalizePath should handle null gracefully', () => {
      expect(() => normalizePath(null)).not.toThrow();
      expect(normalizePath(null)).toBe('');
    });

    it('normalizePath should handle undefined gracefully', () => {
      expect(() => normalizePath(undefined)).not.toThrow();
    });

    it('getDisplayPath should handle null gracefully', () => {
      expect(() => getDisplayPath(null)).not.toThrow();
    });

    it('getDisplayPath should handle undefined gracefully', () => {
      expect(() => getDisplayPath(undefined)).not.toThrow();
    });

    it('resolveImportPath should handle invalid paths gracefully', () => {
      expect(() => resolveImportPath('', './test')).not.toThrow();
    });

    it('uniquePaths should handle null gracefully', () => {
      expect(() => uniquePaths(null)).not.toThrow();
    });

    it('pathsEqual should handle null/undefined', () => {
      expect(pathsEqual(null, null)).toBe(true);
      expect(pathsEqual(null, '/src/a.js')).toBe(false);
      expect(pathsEqual(undefined, undefined)).toBe(true);
    });

    it('getFileExtension should handle null gracefully', () => {
      expect(() => getFileExtension(null)).not.toThrow();
    });

    it('isRelativePath should handle null gracefully', () => {
      expect(() => isRelativePath(null)).not.toThrow();
      expect(isRelativePath(null)).toBe(false);
    });
  });

  describe('Integration with GraphBuilder', () => {
    it('should normalize paths when building graphs', () => {
      const normalizedPath = normalizePath('src\\utils\\helpers.js');
      const displayPath = getDisplayPath(normalizedPath);
      
      expect(normalizedPath).toBe('src/utils/helpers.js');
      expect(displayPath).toContain('helpers.js');
    });

    it('should resolve import paths correctly', () => {
      const fromFile = '/project/src/components/Button.js';
      const importSource = '../utils/helpers';
      const resolved = resolveImportPath(fromFile, importSource);
      
      expect(resolved).toBe('/project/src/utils/helpers.js');
    });

    it('should detect relative imports in graph', () => {
      const imports = ['./utils', '../helpers', 'lodash', '/absolute'];
      const relativeImports = imports.filter(isRelativePath);
      
      expect(relativeImports).toHaveLength(2);
      expect(relativeImports).toContain('./utils');
      expect(relativeImports).toContain('../helpers');
    });
  });
});
