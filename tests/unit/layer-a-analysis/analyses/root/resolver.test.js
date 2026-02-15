/**
 * @fileoverview resolver.test.js - ROOT INFRASTRUCTURE TEST
 * 
 * Tests for resolver.js - DEPENDENCY RESOLUTION
 * ⭐ CRITICAL - Resolves imports to actual file paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveImport,
  resolveImports,
  getResolutionConfig
} from '#layer-a/resolver.js';
import {
  createMockResolverResult,
  ProjectStructureBuilder
} from '../../../../../tests/factories/root-infrastructure-test.factory.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    stat: vi.fn()
  }
}));

describe('ROOT INFRASTRUCTURE: resolver.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Structure Contract', () => {
    it('MUST export resolveImport function', () => {
      expect(resolveImport).toBeDefined();
      expect(typeof resolveImport).toBe('function');
    });

    it('MUST export resolveImports function', () => {
      expect(resolveImports).toBeDefined();
      expect(typeof resolveImports).toBe('function');
    });

    it('MUST export getResolutionConfig function', () => {
      expect(getResolutionConfig).toBeDefined();
      expect(typeof getResolutionConfig).toBe('function');
    });
  });

  describe('resolveImport - Return Structure', () => {
    it('MUST return an object with resolved property', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockResolvedValue({});

      const result = await resolveImport('./utils', 'src/main.js', '/test', {});
      expect(result).toHaveProperty('resolved');
    });

    it('MUST return an object with type property', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockResolvedValue({});

      const result = await resolveImport('./utils', 'src/main.js', '/test', {});
      expect(result).toHaveProperty('type');
      expect(['local', 'external', 'unresolved']).toContain(result.type);
    });

    it('MUST return an object with reason property', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockResolvedValue({});

      const result = await resolveImport('./utils', 'src/main.js', '/test', {});
      expect(result).toHaveProperty('reason');
      expect(typeof result.reason).toBe('string');
    });
  });

  describe('resolveImport - Local Imports', () => {
    it('MUST resolve relative imports (./)', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockResolvedValue({});

      const result = await resolveImport('./utils', 'src/main.js', '/test', {});
      expect(result.type).toBe('local');
      expect(result.resolved).toBeDefined();
    });

    it('MUST resolve parent imports (../)', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockResolvedValue({});

      const result = await resolveImport('../utils', 'src/components/main.js', '/test', {});
      expect(result.type).toBe('local');
    });

    it('MUST resolve absolute imports (/)', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockResolvedValue({});

      const result = await resolveImport('/src/utils', 'src/main.js', '/test', {});
      expect(result.type).toBe('local');
    });

    it('MUST resolve imports without extension', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockImplementation((path) => {
        if (path.endsWith('.js')) return Promise.resolve({});
        return Promise.reject(new Error('Not found'));
      });

      const result = await resolveImport('./utils', 'src/main.js', '/test', {});
      expect(result.type).toBe('local');
      expect(result.resolved).toBeTruthy();
    });

    it('MUST resolve directory imports to index.js', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockImplementation((path) => {
        if (path.includes('index.js')) return Promise.resolve({});
        return Promise.reject(new Error('Not found'));
      });

      const result = await resolveImport('./components', 'src/main.js', '/test', {});
      expect(result.type).toBe('local');
    });
  });

  describe('resolveImport - External Imports', () => {
    it('MUST classify node_modules imports as external', async () => {
      const result = await resolveImport('react', 'src/main.js', '/test', {});
      expect(result.type).toBe('external');
      expect(result.resolved).toBeNull();
    });

    it('MUST classify npm package imports as external', async () => {
      const result = await resolveImport('lodash/debounce', 'src/main.js', '/test', {});
      expect(result.type).toBe('external');
    });

    it('MUST classify Node.js built-ins as external', async () => {
      const result = await resolveImport('fs', 'src/main.js', '/test', {});
      expect(result.type).toBe('external');
    });

    it('MUST classify Node.js built-in with prefix as external', async () => {
      const result = await resolveImport('node:fs', 'src/main.js', '/test', {});
      expect(result.type).toBe('external');
    });
  });

  describe('resolveImport - Alias Resolution', () => {
    it('MUST resolve aliases from tsconfig paths', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockResolvedValue({});

      const aliases = { '@': 'src' };
      const result = await resolveImport('@/components/Button', 'src/main.js', '/test', aliases);
      expect(result.type).toBe('local');
    });

    it('MUST resolve package.json imports aliases', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return Promise.resolve(Buffer.from(JSON.stringify({
            imports: {
              '#utils/*': './src/utils/*'
            }
          })));
        }
        if (path.endsWith('.js')) return Promise.resolve({});
        return Promise.reject(new Error('Not found'));
      });

      const result = await resolveImport('#utils/helpers', 'src/main.js', '/test', {
        '#utils': './src/utils'
      });
      expect(result.type).toBe('local');
    });

    it('MUST handle unresolved aliases', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockRejectedValue(new Error('Not found'));

      const aliases = { '@': 'src' };
      const result = await resolveImport('@/nonexistent', 'src/main.js', '/test', aliases);
      expect(result.type).toBe('unresolved');
    });
  });

  describe('resolveImport - Error Handling', () => {
    it('MUST handle file not found as unresolved', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockRejectedValue(new Error('ENOENT'));

      const result = await resolveImport('./nonexistent', 'src/main.js', '/test', {});
      expect(result.type).toBe('unresolved');
    });

    it('MUST handle paths outside project as external or unresolved', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockRejectedValue(new Error('ENOENT'));
      
      const result = await resolveImport('../../outside', 'src/deep/nested/file.js', '/test', {});
      // Implementation may classify as 'external' or 'unresolved' depending on path resolution
      expect(['external', 'unresolved']).toContain(result.type);
    });

    it('MUST handle malformed paths gracefully', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockRejectedValue(new Error('Invalid path'));

      const result = await resolveImport('../../../', 'src/main.js', '/test', {});
      expect(['local', 'external', 'unresolved']).toContain(result.type);
    });
  });

  describe('resolveImports - Batch Processing', () => {
    it('MUST resolve multiple imports', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockResolvedValue({});

      const imports = ['./utils', './helpers', './constants'];
      const results = await resolveImports(imports, 'src/main.js', '/test', {});
      
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(3);
    });

    it('MUST handle mixed import types', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockImplementation((path) => {
        if (path.includes('utils')) return Promise.resolve({});
        return Promise.reject(new Error('Not found'));
      });

      const imports = ['./utils', 'react', './nonexistent'];
      const results = await resolveImports(imports, 'src/main.js', '/test', {});
      
      expect(results[0].type).toBe('local');
      expect(results[1].type).toBe('external');
      expect(results[2].type).toBe('unresolved');
    });
  });

  describe('getResolutionConfig', () => {
    it('MUST return config object', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('Not found'));

      const config = await getResolutionConfig('/test');
      expect(config).toBeTypeOf('object');
    });

    it('MUST include projectRoot', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('Not found'));

      const config = await getResolutionConfig('/test');
      expect(config).toHaveProperty('projectRoot', '/test');
    });

    it('MUST include aliases', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('Not found'));

      const config = await getResolutionConfig('/test');
      expect(config).toHaveProperty('aliases');
      expect(typeof config.aliases).toBe('object');
    });

    it('MUST include supportedExtensions', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockRejectedValue(new Error('Not found'));

      const config = await getResolutionConfig('/test');
      expect(config).toHaveProperty('supportedExtensions');
      expect(Array.isArray(config.supportedExtensions)).toBe(true);
    });

    it('MUST read aliases from tsconfig.json', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockImplementation((path) => {
        if (path.includes('tsconfig.json')) {
          return Promise.resolve(Buffer.from(JSON.stringify({
            compilerOptions: {
              paths: {
                '@/*': ['src/*']
              }
            }
          })));
        }
        return Promise.reject(new Error('Not found'));
      });

      const config = await getResolutionConfig('/test');
      expect(config.aliases).toHaveProperty('@', 'src');
    });

    it('MUST read aliases from package.json imports', async () => {
      const fs = await import('fs/promises');
      fs.default.readFile.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return Promise.resolve(Buffer.from(JSON.stringify({
            imports: {
              '#utils/*': './src/utils/*'
            }
          })));
        }
        return Promise.reject(new Error('Not found'));
      });

      const config = await getResolutionConfig('/test');
      expect(Object.keys(config.aliases).length).toBeGreaterThan(0);
    });
  });

  describe('Factory Integration', () => {
    it('SHOULD work with createMockResolverResult', () => {
      const result = createMockResolverResult('src/utils.js', 'local', 'Test reason');
      expect(result).toEqual({
        resolved: 'src/utils.js',
        type: 'local',
        reason: 'Test reason'
      });
    });

    it('SHOULD work with ProjectStructureBuilder', async () => {
      const project = ProjectStructureBuilder.create('/test')
        .withPackageJson({
          imports: {
            '#config': './src/config/index.js'
          }
        })
        .withJsConfig({
          compilerOptions: {
            paths: {
              '@/*': ['src/*']
            }
          }
        })
        .build();

      const fs = await import('fs/promises');
      fs.default.readFile.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return Promise.resolve(Buffer.from(JSON.stringify(project.packageJson)));
        }
        if (path.includes('jsconfig.json')) {
          return Promise.resolve(Buffer.from(JSON.stringify(project.jsconfigJson)));
        }
        return Promise.reject(new Error('Not found'));
      });

      const config = await getResolutionConfig(project.rootPath);
      expect(config).toBeDefined();
    });
  });

  describe('File Extension Support', () => {
    it('MUST support .js extension', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockResolvedValue({});

      const result = await resolveImport('./utils.js', 'src/main.js', '/test', {});
      expect(result.type).toBe('local');
    });

    it('MUST support .ts extension', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockImplementation((path) => {
        if (path.endsWith('.ts')) return Promise.resolve({});
        return Promise.reject(new Error('Not found'));
      });

      const result = await resolveImport('./utils', 'src/main.js', '/test', {});
      expect(result.type).toBe('local');
    });

    it('MUST support .jsx extension', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockImplementation((path) => {
        if (path.endsWith('.jsx')) return Promise.resolve({});
        return Promise.reject(new Error('Not found'));
      });

      const result = await resolveImport('./utils', 'src/main.js', '/test', {});
      expect(result.type).toBe('local');
    });

    it('MUST support .tsx extension', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockImplementation((path) => {
        if (path.endsWith('.tsx')) return Promise.resolve({});
        return Promise.reject(new Error('Not found'));
      });

      const result = await resolveImport('./utils', 'src/main.js', '/test', {});
      expect(result.type).toBe('local');
    });

    it('MUST support .mjs extension', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockImplementation((path) => {
        if (path.endsWith('.mjs')) return Promise.resolve({});
        return Promise.reject(new Error('Not found'));
      });

      const result = await resolveImport('./utils', 'src/main.js', '/test', {});
      expect(result.type).toBe('local');
    });

    it('MUST support .cjs extension', async () => {
      const fs = await import('fs/promises');
      fs.default.stat.mockImplementation((path) => {
        if (path.endsWith('.cjs')) return Promise.resolve({});
        return Promise.reject(new Error('Not found'));
      });

      const result = await resolveImport('./utils', 'src/main.js', '/test', {});
      expect(result.type).toBe('local');
    });
  });
});
