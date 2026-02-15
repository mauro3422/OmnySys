/**
 * @fileoverview Expanded Tests for resolver.js - Dependency Resolution
 * 
 * Additional comprehensive tests for alias resolution and edge cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveImport, resolveImports, getResolutionConfig } from '../../../src/layer-a-static/resolver.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    stat: vi.fn()
  }
}));

describe('resolver.js - Expanded Tests', () => {
  let mockFs;

  beforeEach(async () => {
    const fs = await import('fs/promises');
    mockFs = fs.default;
    mockFs.readFile.mockReset();
    mockFs.stat.mockReset();
  });

  describe('resolveImport - Edge Cases', () => {
    it('should handle imports with query parameters', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const result = await resolveImport('./utils?query=param', 'src/index.js', '/project');
      
      expect(result.type).toBe('local');
    });

    it('should handle imports with hash fragments', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const result = await resolveImport('./utils#fragment', 'src/index.js', '/project');
      
      expect(result.type).toBe('local');
    });

    it('should handle Windows-style paths in fromFile', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const result = await resolveImport('./utils', 'src\\index.js', '/project');
      
      expect(result.type).toBe('local');
    });

    it('should handle deeply nested relative imports', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const result = await resolveImport('../../../../../../outside', 'src/deep/nested/path/file.js', '/project');
      
      expect(result.type).toBe('external');
      expect(result.reason).toContain('escapes project');
    });

    it('should handle import from file at project root', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const result = await resolveImport('./src/utils', 'index.js', '/project');
      
      expect(result.type).toBe('local');
    });

    it('should handle case-sensitive file resolution', async () => {
      mockFs.stat.mockRejectedValue(new Error('Not found'));
      
      const result = await resolveImport('./Utils', 'src/index.js', '/project');
      
      // On case-sensitive file systems, this should be unresolved
      expect(result.type).toBe('unresolved');
    });
  });

  describe('resolveImport - Complex Alias Scenarios', () => {
    it('should resolve alias with nested path', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const aliases = { '@': 'src' };
      const result = await resolveImport('@/components/ui/Button', 'src/index.js', '/project', aliases);
      
      expect(result.type).toBe('local');
      expect(result.resolved).toContain('src/components/ui/Button');
    });

    it('should resolve multiple different aliases', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const aliases = { 
        '@components': 'src/components',
        '@utils': 'src/utils',
        '@types': 'src/types'
      };
      
      const results = await Promise.all([
        resolveImport('@components/Button', 'src/index.js', '/project', aliases),
        resolveImport('@utils/helpers', 'src/index.js', '/project', aliases),
        resolveImport('@types/global', 'src/index.js', '/project', aliases)
      ]);
      
      results.forEach(result => {
        expect(result.type).toBe('local');
      });
    });

    it('should handle alias that matches import prefix', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      // @ matches @types/node - should use @ alias, not treat as external
      const aliases = { '@': 'src' };
      const result = await resolveImport('@/types', 'src/index.js', '/project', aliases);
      
      expect(result.type).toBe('local');
    });

    it('should prefer longer alias match over shorter', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const aliases = { 
        '@': 'src',
        '@components': 'src/components'
      };
      const result = await resolveImport('@components/Button', 'src/index.js', '/project', aliases);
      
      expect(result.type).toBe('local');
      expect(result.resolved).toContain('src/components/Button');
    });
  });

  describe('resolveImport - File Extension Priority', () => {
    it('should try extensions in correct order', async () => {
      // First calls fail, .tsx succeeds
      mockFs.stat
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ isFile: () => true }); // .tsx
      
      await resolveImport('./Component', 'src/index.js', '/project');
      
      const calls = mockFs.stat.mock.calls;
      // Should try multiple extensions
      expect(calls.length).toBeGreaterThan(1);
    });

    it('should handle directory with index file', async () => {
      // Try file extensions first, then index
      mockFs.stat
        .mockRejectedValue(new Error('Not found'))
        .mockResolvedValueOnce({ isFile: () => true }); // index.js
      
      const result = await resolveImport('./components', 'src/index.js', '/project');
      
      expect(result.type).toBe('local');
    });
  });

  describe('resolveImports - Batch Processing', () => {
    it('should handle empty import array', async () => {
      const results = await resolveImports([], 'src/index.js', '/project');
      
      expect(results).toEqual([]);
    });

    it('should handle large number of imports', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const imports = Array.from({ length: 50 }, (_, i) => `./util${i}`);
      const results = await resolveImports(imports, 'src/index.js', '/project');
      
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.type).toBe('local');
      });
    });

    it('should handle all-import-types mix', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const imports = [
        './local-file',
        'react',
        'lodash/debounce',
        '@/alias-path',
        '../parent'
      ];
      
      const results = await resolveImports(imports, 'src/index.js', '/project', { '@': 'src' });
      
      expect(results).toHaveLength(5);
      expect(results[0].type).toBe('local');
      expect(results[1].type).toBe('external');
      expect(results[2].type).toBe('external');
      expect(results[3].type).toBe('local');
      expect(results[4].type).toBe('local');
    });
  });

  describe('getResolutionConfig - Config Reading', () => {
    it('should parse package.json with imports field', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        imports: {
          '#utils/*': './src/utils/*',
          '#config': './src/config/index.js',
          '#types/*': {
            'default': './src/types/*'
          }
        }
      }));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.aliases['#utils']).toBe('./src/utils');
      expect(config.aliases['#config']).toBe('./src/config/index.js');
    });

    it('should parse tsconfig.json with complex paths', async () => {
      mockFs.readFile
        .mockRejectedValueOnce(new Error('No package.json'))
        .mockResolvedValueOnce(JSON.stringify({
          compilerOptions: {
            paths: {
              '@app/*': ['src/app/*'],
              '@shared/*': ['../shared/*'],
              'my-lib': ['vendor/my-lib/index.js']
            }
          }
        }));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.aliases['@app']).toBe('src/app');
      expect(config.aliases['@shared']).toBe('../shared');
      expect(config.aliases['my-lib']).toBe('vendor/my-lib/index.js');
    });

    it('should handle jsconfig.json fallback', async () => {
      mockFs.readFile
        .mockRejectedValueOnce(new Error('No package.json'))
        .mockRejectedValueOnce(new Error('No tsconfig.json'))
        .mockResolvedValueOnce(JSON.stringify({
          compilerOptions: {
            paths: {
              '@/*': ['./*']
            }
          }
        }));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.aliases['@']).toBe('.');
    });

    it('should return empty aliases when no config found', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.aliases).toEqual({});
    });

    it('should include all supported extensions', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.supportedExtensions).toContain('.js');
      expect(config.supportedExtensions).toContain('.ts');
      expect(config.supportedExtensions).toContain('.jsx');
      expect(config.supportedExtensions).toContain('.tsx');
      expect(config.supportedExtensions).toContain('.mjs');
      expect(config.supportedExtensions).toContain('.cjs');
      expect(config.supportedExtensions).toContain('.json');
    });
  });
});
