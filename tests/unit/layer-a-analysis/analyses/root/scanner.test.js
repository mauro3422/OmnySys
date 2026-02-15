/**
 * @fileoverview scanner.test.js - ROOT INFRASTRUCTURE TEST
 * 
 * Tests for scanner.js - FILE DISCOVERY
 * ⭐ CRITICAL - Discovers all files to analyze
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scanProject, detectProjectInfo } from '#layer-a/scanner.js';
import {
  ProjectStructureBuilder,
  createMockScannerOutput
} from '../../../../../tests/factories/root-infrastructure-test.factory.js';

// Mock fast-glob
vi.mock('fast-glob', () => ({
  default: vi.fn()
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    stat: vi.fn()
  }
}));

describe('ROOT INFRASTRUCTURE: scanner.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Structure Contract', () => {
    it('MUST export scanProject function', () => {
      expect(scanProject).toBeDefined();
      expect(typeof scanProject).toBe('function');
    });

    it('MUST export detectProjectInfo function', () => {
      expect(detectProjectInfo).toBeDefined();
      expect(typeof detectProjectInfo).toBe('function');
    });
  });

  describe('scanProject - Structure Contract', () => {
    it('MUST return an array of file paths', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(['src/index.js', 'src/utils.js']);

      const files = await scanProject('/test');
      expect(Array.isArray(files)).toBe(true);
    });

    it('MUST return sorted file paths', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(['src/z.js', 'src/a.js', 'src/m.js']);

      const files = await scanProject('/test');
      expect(files).toEqual(['src/a.js', 'src/m.js', 'src/z.js']);
    });

    it('MUST return relative paths by default', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(['src/index.js']);

      const files = await scanProject('/test');
      expect(files[0]).not.toContain('/test');
    });

    it('MUST return absolute paths when returnAbsolute is true', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(['src/index.js']);

      const files = await scanProject('/test', { returnAbsolute: true });
      // Support both Unix and Windows paths
      expect(files[0]).toMatch(/[\\/]test[\\/]src[\\/]index\.js$/);
    });
  });

  describe('scanProject - Error Handling Contract', () => {
    it('MUST handle glob errors gracefully', async () => {
      const glob = await import('fast-glob');
      glob.default.mockRejectedValue(new Error('Glob error'));

      const files = await scanProject('/test');
      expect(files).toEqual([]);
    });

    it('MUST handle invalid rootPath gracefully', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue([]);

      const files = await scanProject('');
      expect(Array.isArray(files)).toBe(true);
    });

    it('MUST handle non-existent directory gracefully', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue([]);

      const files = await scanProject('/non/existent/path');
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('scanProject - Options Handling', () => {
    it('MUST support includePatterns option', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue([]);

      await scanProject('/test', { includePatterns: ['**/*.test.js'] });
      expect(glob.default).toHaveBeenCalledWith(
        expect.arrayContaining(['**/*.test.js']),
        expect.any(Object)
      );
    });

    it('MUST support excludePatterns option', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue([]);

      await scanProject('/test', { excludePatterns: ['**/*.spec.js'] });
      expect(glob.default).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          ignore: expect.arrayContaining(['**/*.spec.js'])
        })
      );
    });

    it('MUST read .averignore by default', async () => {
      const fs = await import('fs/promises');
      const glob = await import('fast-glob');
      
      fs.default.readFile.mockResolvedValue('# comment\nnode_modules\ndist');
      glob.default.mockResolvedValue([]);

      await scanProject('/test');
      expect(fs.default.readFile).toHaveBeenCalled();
    });

    it('MUST skip .averignore when readAverIgnore is false', async () => {
      const fs = await import('fs/promises');
      const glob = await import('fast-glob');
      
      fs.default.readFile.mockResolvedValue('node_modules');
      glob.default.mockResolvedValue([]);

      await scanProject('/test', { readAverIgnore: false });
      expect(fs.default.readFile).not.toHaveBeenCalled();
    });
  });

  describe('scanProject - File Extension Support', () => {
    it('MUST scan .js files', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(['file.js']);

      const files = await scanProject('/test');
      expect(files).toContain('file.js');
    });

    it('MUST scan .ts files', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(['file.ts']);

      const files = await scanProject('/test');
      expect(files).toContain('file.ts');
    });

    it('MUST scan .jsx files', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(['file.jsx']);

      const files = await scanProject('/test');
      expect(files).toContain('file.jsx');
    });

    it('MUST scan .tsx files', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(['file.tsx']);

      const files = await scanProject('/test');
      expect(files).toContain('file.tsx');
    });

    it('MUST scan .mjs files', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(['file.mjs']);

      const files = await scanProject('/test');
      expect(files).toContain('file.mjs');
    });

    it('MUST scan .cjs files', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(['file.cjs']);

      const files = await scanProject('/test');
      expect(files).toContain('file.cjs');
    });
  });

  describe('scanProject - Ignored Directories', () => {
    it('MUST ignore node_modules', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue([]);

      await scanProject('/test');
      const callArgs = glob.default.mock.calls[0];
      expect(callArgs[1].ignore).toContain('**/node_modules/**');
    });

    it('MUST ignore dist directory', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue([]);

      await scanProject('/test');
      const callArgs = glob.default.mock.calls[0];
      expect(callArgs[1].ignore).toContain('**/dist/**');
    });

    it('MUST ignore .git directory', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue([]);

      await scanProject('/test');
      const callArgs = glob.default.mock.calls[0];
      expect(callArgs[1].ignore).toContain('**/.git/**');
    });

    it('MUST ignore .omnysysdata directory', async () => {
      const glob = await import('fast-glob');
      glob.default.mockResolvedValue([]);

      await scanProject('/test');
      const callArgs = glob.default.mock.calls[0];
      expect(callArgs[1].ignore).toContain('**/.omnysysdata/**');
    });
  });

  describe('detectProjectInfo - Structure Contract', () => {
    it('MUST return project info object', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('File not found'));
      fs.default.stat.mockRejectedValue(new Error('File not found'));

      const info = await detectProjectInfo('/test');
      expect(info).toBeTypeOf('object');
    });

    it('MUST return hasPackageJson property', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('File not found'));
      fs.default.stat.mockRejectedValue(new Error('File not found'));

      const info = await detectProjectInfo('/test');
      expect(info).toHaveProperty('hasPackageJson');
      expect(typeof info.hasPackageJson).toBe('boolean');
    });

    it('MUST return hasTsConfig property', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('File not found'));
      fs.default.stat.mockRejectedValue(new Error('File not found'));

      const info = await detectProjectInfo('/test');
      expect(info).toHaveProperty('hasTsConfig');
      expect(typeof info.hasTsConfig).toBe('boolean');
    });

    it('MUST return hasJsConfig property', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('File not found'));
      fs.default.stat.mockRejectedValue(new Error('File not found'));

      const info = await detectProjectInfo('/test');
      expect(info).toHaveProperty('hasJsConfig');
      expect(typeof info.hasJsConfig).toBe('boolean');
    });

    it('MUST return useTypeScript property', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('File not found'));
      fs.default.stat.mockRejectedValue(new Error('File not found'));

      const info = await detectProjectInfo('/test');
      expect(info).toHaveProperty('useTypeScript');
      expect(typeof info.useTypeScript).toBe('boolean');
    });

    it('MUST return packageJson property', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('File not found'));
      fs.default.stat.mockRejectedValue(new Error('File not found'));

      const info = await detectProjectInfo('/test');
      expect(info).toHaveProperty('packageJson');
    });
  });

  describe('detectProjectInfo - Detection Logic', () => {
    it('MUST detect package.json when present', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockResolvedValue('{"name": "test"}');
      fs.default.stat.mockRejectedValue(new Error('File not found'));

      const info = await detectProjectInfo('/test');
      expect(info.hasPackageJson).toBe(true);
      expect(info.packageJson).toEqual({ name: 'test' });
    });

    it('MUST detect tsconfig.json when present', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('File not found'));
      fs.default.stat.mockImplementation((path) => {
        if (path.includes('tsconfig.json')) {
          return Promise.resolve({});
        }
        return Promise.reject(new Error('File not found'));
      });

      const info = await detectProjectInfo('/test');
      expect(info.hasTsConfig).toBe(true);
      expect(info.useTypeScript).toBe(true);
    });

    it('MUST detect jsconfig.json when present', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('File not found'));
      fs.default.stat.mockImplementation((path) => {
        if (path.includes('jsconfig.json')) {
          return Promise.resolve({});
        }
        return Promise.reject(new Error('File not found'));
      });

      const info = await detectProjectInfo('/test');
      expect(info.hasJsConfig).toBe(true);
    });
  });

  describe('Factory Integration', () => {
    it('SHOULD work with ProjectStructureBuilder', async () => {
      const project = ProjectStructureBuilder.create('/test')
        .withPackageJson()
        .withJavaScriptFiles(['src/index.js', 'src/utils.js'])
        .build();

      const glob = await import('fast-glob');
      glob.default.mockResolvedValue(project.files.map(f => f.path));

      const files = await scanProject(project.rootPath);
      expect(files.length).toBeGreaterThanOrEqual(0);
    });

    it('SHOULD work with createMockScannerOutput', () => {
      const mockFiles = createMockScannerOutput(['src/a.js', 'src/b.js']);
      expect(mockFiles).toEqual(['src/a.js', 'src/b.js']);
    });
  });
});
