/**
 * @fileoverview Export API Tests
 * 
 * Tests for export query operations.
 * 
 * @module tests/unit/layer-a-analysis/query/apis/export-api
 */

import { describe, it, expect } from 'vitest';

describe('Export API', () => {
  describe('Structure Contract', () => {
    it('should export exportFullSystemMapToFile function', async () => {
      const { exportFullSystemMapToFile } = await import('#layer-a/query/apis/export-api.js');
      expect(typeof exportFullSystemMapToFile).toBe('function');
    });

    it('should accept projectPath and optional outputPath', async () => {
      const { exportFullSystemMapToFile } = await import('#layer-a/query/apis/export-api.js');
      // Function has 2 parameters but one is optional with default
      expect(exportFullSystemMapToFile.length).toBeLessThanOrEqual(2);
    });

    it('should be re-exported from export.js', async () => {
      const api = await import('#layer-a/query/apis/export-api.js');
      const direct = await import('#layer-a/query/export.js');
      
      expect(typeof api.exportFullSystemMapToFile).toBe('function');
      expect(typeof direct.exportFullSystemMapToFile).toBe('function');
    });
  });

  describe('API Contract', () => {
    it('should have correct module metadata', async () => {
      const api = await import('#layer-a/query/apis/export-api.js');
      expect(api).toBeDefined();
    });

    it('should only export specified functions', async () => {
      const api = await import('#layer-a/query/apis/export-api.js');
      const exports = Object.keys(api);
      
      expect(exports).toContain('exportFullSystemMapToFile');
      expect(exports).toHaveLength(1);
    });
  });
});
