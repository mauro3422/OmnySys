/**
 * @fileoverview Tests for tier2/unresolved-imports.js
 * 
 * Tests the findUnresolvedImports function.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findUnresolvedImports } from '#layer-a/analyses/tier2/unresolved-imports.js';
import { createMockSystemMap } from '../../../../factories/analysis.factory.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn()
  }
}));

describe('tier2/unresolved-imports.js', () => {
  let mockFs;

  beforeEach(async () => {
    const fs = await import('fs/promises');
    mockFs = fs.default;
    mockFs.readFile.mockReset();
  });

  describe('findUnresolvedImports', () => {
    it('should return structure with all required fields', async () => {
      const systemMap = createMockSystemMap({
        unresolvedImports: {}
      });

      const result = await findUnresolvedImports(systemMap);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byFile');
      expect(result).toHaveProperty('recommendation');
    });

    it('should filter out external module imports', async () => {
      const systemMap = createMockSystemMap({
        unresolvedImports: {
          'src/index.js': [
            { source: 'react', type: 'external', severity: 'LOW' },
            { source: 'lodash', type: 'external', severity: 'LOW' }
          ]
        }
      });

      const result = await findUnresolvedImports(systemMap);

      expect(result.total).toBe(0);
    });

    it('should include only HIGH severity unresolved imports', async () => {
      const systemMap = createMockSystemMap({
        unresolvedImports: {
          'src/index.js': [
            { source: './missing', type: 'unresolved', severity: 'HIGH' },
            { source: './maybe', type: 'unresolved', severity: 'MEDIUM' },
            { source: './ok', type: 'unresolved', severity: 'LOW' }
          ]
        }
      });

      const result = await findUnresolvedImports(systemMap);

      expect(result.total).toBe(1);
      expect(result.byFile['src/index.js']).toHaveLength(1);
    });

    it('should handle multiple files with unresolved imports', async () => {
      const systemMap = createMockSystemMap({
        unresolvedImports: {
          'src/a.js': [{ source: './missing1', type: 'unresolved', severity: 'HIGH' }],
          'src/b.js': [{ source: './missing2', type: 'unresolved', severity: 'HIGH' }]
        }
      });

      const result = await findUnresolvedImports(systemMap);

      expect(result.total).toBe(2);
      expect(Object.keys(result.byFile)).toHaveLength(2);
    });

    it('should provide recommendation when no issues found', async () => {
      const systemMap = createMockSystemMap({
        unresolvedImports: {}
      });

      const result = await findUnresolvedImports(systemMap);

      expect(result.recommendation).toContain('All imports resolved');
    });

    it('should provide recommendation with count when issues found', async () => {
      const systemMap = createMockSystemMap({
        unresolvedImports: {
          'src/index.js': [
            { source: './missing', type: 'unresolved', severity: 'HIGH' }
          ]
        }
      });

      const result = await findUnresolvedImports(systemMap);

      expect(result.recommendation).toContain('1');
      expect(result.recommendation).toContain('unresolved');
    });

    it('should detect missing subpath imports configuration', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
        // No imports field
      }));

      const systemMap = createMockSystemMap({
        unresolvedImports: {
          'src/index.js': [
            { source: '#utils/helpers', type: 'unresolved', severity: 'HIGH' }
          ]
        }
      });

      const result = await findUnresolvedImports(systemMap, '/project');

      expect(result.subpathConfig).toBeDefined();
      expect(result.subpathConfig.hasConfig).toBe(false);
      expect(result.subpathConfig.unresolvedSubpathImports).toHaveLength(1);
    });

    it('should detect existing subpath config but unresolved imports', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        name: 'test-project',
        imports: {
          '#utils/*': './src/utils/*'
        }
      }));

      const systemMap = createMockSystemMap({
        unresolvedImports: {
          'src/index.js': [
            { source: '#utils/missing', type: 'unresolved', severity: 'HIGH' }
          ]
        }
      });

      const result = await findUnresolvedImports(systemMap, '/project');

      expect(result.subpathConfig.hasConfig).toBe(true);
      expect(result.subpathConfig.configuredAliases).toContain('#utils/*');
    });

    it('should handle missing package.json gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const systemMap = createMockSystemMap({
        unresolvedImports: {
          'src/index.js': [
            { source: '#utils/helpers', type: 'unresolved', severity: 'HIGH' }
          ]
        }
      });

      const result = await findUnresolvedImports(systemMap, '/project');

      expect(result.subpathConfig.hasConfig).toBe(false);
    });

    it('should handle null projectRoot', async () => {
      const systemMap = createMockSystemMap({
        unresolvedImports: {}
      });

      const result = await findUnresolvedImports(systemMap, null);

      expect(result.subpathConfig).toBeNull();
    });

    it('should include subpath imports in recommendation', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ name: 'test' }));

      const systemMap = createMockSystemMap({
        unresolvedImports: {
          'src/index.js': [
            { source: '#utils/helpers', type: 'unresolved', severity: 'HIGH' },
            { source: '#config', type: 'unresolved', severity: 'HIGH' }
          ]
        }
      });

      const result = await findUnresolvedImports(systemMap, '/project');

      expect(result.recommendation).toContain('subpath');
    });

    it('should handle empty unresolved imports object', async () => {
      const systemMap = createMockSystemMap({
        unresolvedImports: {}
      });

      const result = await findUnresolvedImports(systemMap);

      expect(result.total).toBe(0);
      expect(result.byFile).toEqual({});
    });

    it('should handle missing unresolved imports field', async () => {
      const systemMap = createMockSystemMap({});

      const result = await findUnresolvedImports(systemMap);

      expect(result.total).toBe(0);
    });

    it('should filter by severity correctly', async () => {
      const systemMap = createMockSystemMap({
        unresolvedImports: {
          'src/index.js': [
            { source: './critical', type: 'unresolved', severity: 'HIGH' },
            { source: 'react', type: 'external', severity: 'HIGH' } // Should be filtered by type
          ]
        }
      });

      const result = await findUnresolvedImports(systemMap);

      expect(result.total).toBe(1);
      expect(result.byFile['src/index.js'][0].source).toBe('./critical');
    });
  });
});
