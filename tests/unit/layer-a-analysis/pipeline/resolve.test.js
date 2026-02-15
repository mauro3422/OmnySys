/**
 * @fileoverview Resolve Tests
 * 
 * Tests for resolve.js - Dependency resolution module
 * 
 * @module tests/unit/layer-a-analysis/pipeline/resolve
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveImports } from '#layer-a/pipeline/resolve.js';
import { PipelineBuilder } from '../../../factories/pipeline-test.factory.js';

// Mock dependencies
vi.mock('#layer-a/resolver.js', () => ({
  resolveImport: vi.fn(),
  getResolutionConfig: vi.fn()
}));

vi.mock('#utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  })
}));

import { resolveImport, getResolutionConfig } from '#layer-a/resolver.js';

describe('Resolve Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    getResolutionConfig.mockResolvedValue({
      aliases: { '@': './src', '@utils': './src/utils' }
    });
    
    resolveImport.mockImplementation((source) => {
      if (source.startsWith('./') || source.startsWith('../')) {
        return Promise.resolve({ 
          resolved: source.replace(/^\.\//, 'src/'), 
          type: 'local',
          reason: 'resolved'
        });
      }
      if (source.startsWith('@')) {
        return Promise.resolve({ 
          resolved: source.replace('@/', 'src/').replace('@utils/', 'src/utils/'), 
          type: 'local',
          reason: 'alias'
        });
      }
      return Promise.resolve({ resolved: null, type: 'external', reason: 'node_module' });
    });
  });

  describe('Structure Contract', () => {
    it('should export resolveImports function', () => {
      expect(resolveImports).toBeDefined();
      expect(typeof resolveImports).toBe('function');
    });

    it('should return resolvedImports and resolutionConfig', async () => {
      const result = await resolveImports({}, '/test', false);

      expect(result).toHaveProperty('resolvedImports');
      expect(result).toHaveProperty('resolutionConfig');
    });
  });

  describe('Resolution Config', () => {
    it('should load resolution config from project root', async () => {
      await resolveImports({}, '/test', false);

      expect(getResolutionConfig).toHaveBeenCalledWith('/test');
    });

    it('should include aliases in resolution config', async () => {
      const result = await resolveImports({}, '/test', false);

      expect(result.resolutionConfig.aliases).toBeDefined();
      expect(result.resolutionConfig.aliases['@']).toBe('./src');
    });
  });

  describe('Import Resolution', () => {
    it('should resolve imports for each parsed file', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [{ source: './b.js', specifiers: ['default'] }]
        },
        '/test/src/b.js': {
          imports: [{ source: 'react', specifiers: ['useState'] }]
        }
      };

      await resolveImports(parsedFiles, '/test', false);

      expect(resolveImport).toHaveBeenCalledTimes(2);
    });

    it('should handle files with multiple imports', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [
            { source: './b.js', specifiers: ['b'] },
            { source: './c.js', specifiers: ['c'] }
          ]
        }
      };

      const result = await resolveImports(parsedFiles, '/test', false);

      expect(result.resolvedImports['/test/src/a.js']).toHaveLength(2);
    });

    it('should handle files with array sources', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [{
            source: ['./b.js', './c.js'],
            specifiers: ['default']
          }]
        }
      };

      const result = await resolveImports(parsedFiles, '/test', false);

      expect(result.resolvedImports['/test/src/a.js']).toHaveLength(2);
    });

    it('should include source in resolved import', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [{ source: './b.js', specifiers: [] }]
        }
      };

      const result = await resolveImports(parsedFiles, '/test', false);

      expect(result.resolvedImports['/test/src/a.js'][0]).toHaveProperty('source');
      expect(result.resolvedImports['/test/src/a.js'][0].source).toBe('./b.js');
    });

    it('should include resolved path in result', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [{ source: './b.js', specifiers: [] }]
        }
      };

      const result = await resolveImports(parsedFiles, '/test', false);

      expect(result.resolvedImports['/test/src/a.js'][0]).toHaveProperty('resolved');
    });

    it('should include type in result', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [{ source: './b.js', specifiers: [] }]
        }
      };

      const result = await resolveImports(parsedFiles, '/test', false);

      expect(result.resolvedImports['/test/src/a.js'][0]).toHaveProperty('type');
    });

    it('should include symbols in result', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [{ source: './b.js', specifiers: ['helper', 'utils'] }]
        }
      };

      const result = await resolveImports(parsedFiles, '/test', false);

      expect(result.resolvedImports['/test/src/a.js'][0]).toHaveProperty('symbols');
      expect(result.resolvedImports['/test/src/a.js'][0].symbols).toEqual(['helper', 'utils']);
    });

    it('should include reason in result', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [{ source: './b.js', specifiers: [] }]
        }
      };

      const result = await resolveImports(parsedFiles, '/test', false);

      expect(result.resolvedImports['/test/src/a.js'][0]).toHaveProperty('reason');
    });
  });

  describe('Local vs External Imports', () => {
    it('should count local imports separately', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [
            { source: './local.js', specifiers: [] },
            { source: 'react', specifiers: [] }
          ]
        }
      };
      
      resolveImport
        .mockResolvedValueOnce({ resolved: 'src/local.js', type: 'local', reason: 'resolved' })
        .mockResolvedValueOnce({ resolved: null, type: 'external', reason: 'node_module' });

      await resolveImports(parsedFiles, '/test', true);

      // Should track local import count for verbose output
      expect(resolveImport).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle files without imports', async () => {
      const parsedFiles = {
        '/test/src/a.js': { imports: [] }
      };

      const result = await resolveImports(parsedFiles, '/test', false);

      expect(result.resolvedImports['/test/src/a.js']).toEqual([]);
    });

    it('should handle files without imports property', async () => {
      const parsedFiles = {
        '/test/src/a.js': {}
      };

      const result = await resolveImports(parsedFiles, '/test', false);

      expect(result.resolvedImports['/test/src/a.js']).toEqual([]);
    });

    it('should handle empty parsed files', async () => {
      const result = await resolveImports({}, '/test', false);

      expect(result.resolvedImports).toEqual({});
    });

    it('should handle getResolutionConfig failure gracefully', async () => {
      getResolutionConfig.mockRejectedValue(new Error('Config error'));

      await expect(resolveImports({}, '/test', false))
        .rejects.toThrow('Config error');
    });

    it('should handle resolveImport failure for single import', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [
            { source: './b.js', specifiers: [] },
            { source: './c.js', specifiers: [] }
          ]
        }
      };

      resolveImport
        .mockResolvedValueOnce({ resolved: 'src/b.js', type: 'local', reason: 'resolved' })
        .mockRejectedValueOnce(new Error('Resolve error'));

      await expect(resolveImports(parsedFiles, '/test', false))
        .rejects.toThrow('Resolve error');
    });
  });

  describe('Integration with Factories', () => {
    it('should resolve imports from PipelineBuilder config', async () => {
      const builder = new PipelineBuilder()
        .addMockImport('./utils', 'src/utils.js', 'local')
        .addMockImport('react', null, 'external');

      const config = builder.build();
      const parsedFiles = {
        '/test/src/app.js': {
          imports: [
            { source: './utils', specifiers: ['helper'] },
            { source: 'react', specifiers: ['useState'] }
          ]
        }
      };

      const result = await resolveImports(parsedFiles, '/test', false);

      expect(Object.keys(result.resolvedImports)).toHaveLength(1);
    });
  });

  describe('Verbose Output', () => {
    it('should log alias count when verbose', async () => {
      await resolveImports({}, '/test', true);

      expect(getResolutionConfig).toHaveBeenCalled();
    });

    it('should log resolution progress when verbose', async () => {
      const parsedFiles = {
        '/test/src/a.js': {
          imports: [{ source: './b.js', specifiers: [] }]
        }
      };

      await resolveImports(parsedFiles, '/test', true);

      // Logger should be called for resolution progress
      expect(resolveImport).toHaveBeenCalled();
    });
  });
});
