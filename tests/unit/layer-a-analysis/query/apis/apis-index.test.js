/**
 * @fileoverview APIs Index Tests
 * 
 * Tests for the centralized API exports index.
 * 
 * @module tests/unit/layer-a-analysis/query/apis/apis-index
 */

import { describe, it, expect } from 'vitest';

describe('APIs Index', () => {
  describe('Module Structure', () => {
    it('should export project-api functions', async () => {
      const projectApi = await import('#layer-a/query/apis/project-api.js');
      
      expect(typeof projectApi.getProjectMetadata).toBe('function');
      expect(typeof projectApi.getAnalyzedFiles).toBe('function');
      expect(typeof projectApi.getProjectStats).toBe('function');
      expect(typeof projectApi.findFiles).toBe('function');
    });

    it('should export connections-api functions', async () => {
      const connectionsApi = await import('#layer-a/query/apis/connections-api.js');
      
      expect(typeof connectionsApi.getAllConnections).toBe('function');
    });

    it('should export risk-api functions', async () => {
      const riskApi = await import('#layer-a/query/apis/risk-api.js');
      
      expect(typeof riskApi.getRiskAssessment).toBe('function');
    });

    it('should export export-api functions', async () => {
      const exportApi = await import('#layer-a/query/apis/export-api.js');
      
      expect(typeof exportApi.exportFullSystemMapToFile).toBe('function');
    });
  });

  describe('Individual API Modules', () => {
    it('project-api should have no duplicate exports', async () => {
      const projectApi = await import('#layer-a/query/apis/project-api.js');
      const exports = Object.keys(projectApi);
      const unique = [...new Set(exports)];
      
      expect(exports).toHaveLength(unique.length);
    });

    it('connections-api should have no duplicate exports', async () => {
      const connectionsApi = await import('#layer-a/query/apis/connections-api.js');
      const exports = Object.keys(connectionsApi);
      const unique = [...new Set(exports)];
      
      expect(exports).toHaveLength(unique.length);
    });

    it('risk-api should have no duplicate exports', async () => {
      const riskApi = await import('#layer-a/query/apis/risk-api.js');
      const exports = Object.keys(riskApi);
      const unique = [...new Set(exports)];
      
      expect(exports).toHaveLength(unique.length);
    });

    it('export-api should have no duplicate exports', async () => {
      const exportApi = await import('#layer-a/query/apis/export-api.js');
      const exports = Object.keys(exportApi);
      const unique = [...new Set(exports)];
      
      expect(exports).toHaveLength(unique.length);
    });
  });
});
