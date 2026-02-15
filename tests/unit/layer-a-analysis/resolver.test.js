/**
 * @fileoverview Tests for resolver.js - Dependency Resolution
 * 
 * Tests the resolveImport, resolveImports, and getResolutionConfig functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  resolveImport, 
  resolveImports, 
  getResolutionConfig
} from '../../../src/layer-a-static/resolver.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    stat: vi.fn()
  }
}));

describe('resolver.js', () => {
  let mockFs;

  beforeEach(async () => {
    const fs = await import('fs/promises');
    mockFs = fs.default;
    mockFs.readFile.mockReset();
    mockFs.stat.mockReset();
  });

  describe('resolveImport', () => {
    it('should resolve external modules', async () => {
      const result = await resolveImport('react', 'src/index.js', '/project');
      
      expect(result.type).toBe('external');
      expect(result.resolved).toBeNull();
      expect(result.reason).toContain('External module');
    });

    it('should resolve relative imports', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const result = await resolveImport('./utils', 'src/index.js', '/project');
      
      expect(result.type).toBe('local');
      expect(result.resolved).toBeDefined();
      expect(result.reason).toContain('Resolved relative import');
    });

    it('should resolve imports with extensions', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const result = await resolveImport('./utils.js', 'src/index.js', '/project');
      
      expect(result.type).toBe('local');
    });

    it('should try multiple extensions when no extension provided', async () => {
      mockFs.stat
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ isFile: () => true });
      
      await resolveImport('./utils', 'src/index.js', '/project');
      
      expect(mockFs.stat).toHaveBeenCalledTimes(3);
    });

    it('should resolve index files', async () => {
      mockFs.stat
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ isFile: () => true });
      
      const result = await resolveImport('./utils', 'src/index.js', '/project');
      
      expect(result.type).toBe('local');
    });

    it('should resolve package.json imports (aliases)', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        imports: {
          '#utils/*': './src/utils/*',
          '#config': './src/config/index.js'
        }
      }));
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const aliases = { '#utils': './src/utils', '#config': './src/config' };
      const result = await resolveImport('#utils/helpers', 'src/index.js', '/project', aliases);
      
      expect(result.type).toBe('local');
      expect(result.reason).toContain('alias');
    });

    it('should resolve absolute paths from project root', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const result = await resolveImport('/src/utils', 'src/index.js', '/project');
      
      expect(result.type).toBe('local');
    });

    it('should mark paths outside project as external', async () => {
      const result = await resolveImport('../../outside', 'src/deep/nested/file.js', '/project');
      
      expect(result.type).toBe('external');
      expect(result.reason).toContain('escapes project');
    });

    it('should return unresolved for non-existent files', async () => {
      mockFs.stat.mockRejectedValue(new Error('Not found'));
      
      const result = await resolveImport('./nonexistent', 'src/index.js', '/project');
      
      expect(result.type).toBe('unresolved');
      expect(result.resolved).toBeNull();
    });
  });

  describe('resolveImports', () => {
    it('should resolve multiple imports', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const imports = ['./utils', './helpers'];
      const results = await resolveImports(imports, 'src/index.js', '/project');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('local');
      expect(results[1].type).toBe('local');
    });

    it('should handle mixed import types', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      
      const imports = ['./utils', 'react', './helpers'];
      const results = await resolveImports(imports, 'src/index.js', '/project');
      
      expect(results[0].type).toBe('local');
      expect(results[1].type).toBe('external');
      expect(results[2].type).toBe('local');
    });
  });

  describe('getResolutionConfig', () => {
    it('should return config with projectRoot', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.projectRoot).toBe('/project');
    });

    it('should include supported extensions', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.supportedExtensions).toBeDefined();
      expect(config.supportedExtensions).toContain('.js');
      expect(config.supportedExtensions).toContain('.ts');
    });

    it('should read aliases from package.json imports', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        imports: {
          '#utils/*': './src/utils/*'
        }
      }));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.aliases).toHaveProperty('#utils');
    });

    it('should read aliases from tsconfig.json', async () => {
      mockFs.readFile
        .mockRejectedValueOnce(new Error('No package.json'))
        .mockResolvedValueOnce(JSON.stringify({
          compilerOptions: {
            paths: {
              '@/*': ['src/*']
            }
          }
        }));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.aliases).toHaveProperty('@');
    });

    it('should fallback to jsconfig.json when tsconfig not found', async () => {
      mockFs.readFile
        .mockRejectedValueOnce(new Error('No package.json'))
        .mockRejectedValueOnce(new Error('No tsconfig'))
        .mockResolvedValueOnce(JSON.stringify({
          compilerOptions: {
            paths: {
              '~/*': ['src/*']
            }
          }
        }));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.aliases).toHaveProperty('~');
    });

    it('should handle star wildcards in paths', async () => {
      mockFs.readFile
        .mockRejectedValueOnce(new Error('No package.json'))
        .mockResolvedValueOnce(JSON.stringify({
          compilerOptions: {
            paths: {
              '@components/*': ['src/components/*']
            }
          }
        }));
      
      const config = await getResolutionConfig('/project');
      
      expect(config.aliases['@components']).toBe('src/components');
    });
  });
});
