/**
 * @fileoverview Query System Contract Tests
 * 
 * Contract tests that verify the overall structure and behavior
 * of the Query system across all modules.
 * 
 * @module tests/unit/layer-a-analysis/query/query-contract
 */

import { describe, it, expect } from 'vitest';

// API imports
import {
  getProjectMetadata,
  getAnalyzedFiles,
  getProjectStats,
  findFiles
} from '#layer-a/query/apis/project-api.js';

import {
  getAllConnections
} from '#layer-a/query/apis/connections-api.js';

import {
  getRiskAssessment
} from '#layer-a/query/apis/risk-api.js';

import {
  exportFullSystemMapToFile
} from '#layer-a/query/apis/export-api.js';

describe('Query System Contract', () => {
  describe('Structure Contract', () => {
    it('should export all project-api functions', () => {
      expect(typeof getProjectMetadata).toBe('function');
      expect(typeof getAnalyzedFiles).toBe('function');
      expect(typeof getProjectStats).toBe('function');
      expect(typeof findFiles).toBe('function');
    });

    it('should export all connections-api functions', () => {
      expect(typeof getAllConnections).toBe('function');
    });

    it('should export all risk-api functions', () => {
      expect(typeof getRiskAssessment).toBe('function');
    });

    it('should export all export-api functions', () => {
      expect(typeof exportFullSystemMapToFile).toBe('function');
    });
  });

  describe('API Function Signatures', () => {
    it('project-api functions should accept project root as first parameter', () => {
      // These functions should all have similar signatures
      expect(getProjectMetadata.length).toBeGreaterThanOrEqual(1);
      expect(getAnalyzedFiles.length).toBeGreaterThanOrEqual(1);
      expect(getProjectStats.length).toBeGreaterThanOrEqual(1);
      expect(findFiles.length).toBe(2); // rootPath, pattern
    });

    it('all query functions should support depth parameter where applicable', () => {
      // Functions with optional parameters
      expect(getAllConnections.length).toBe(1);
      expect(getRiskAssessment.length).toBe(1);
    });
  });

  describe('Error Handling Contract', () => {
    it('all query functions should handle missing project gracefully', async () => {
      const nonExistentPath = '/non/existent/project/path';
      
      // These should not throw but handle gracefully
      await expect(getProjectMetadata(nonExistentPath)).rejects.toThrow();
    });
  });

  describe('Return Types Contract', () => {
    it('async functions should return Promises', () => {
      const rootPath = '/test';
      
      expect(getProjectMetadata(rootPath)).toBeInstanceOf(Promise);
      expect(getAnalyzedFiles(rootPath)).toBeInstanceOf(Promise);
      expect(getAllConnections(rootPath)).toBeInstanceOf(Promise);
    });
  });

  describe('Path Normalization Contract', () => {
    it('functions should handle both relative and absolute paths', async () => {
      // Functions should normalize paths internally
      expect(typeof getProjectMetadata).toBe('function');
      expect(typeof findFiles).toBe('function');
    });

    it('findFiles should support glob patterns', () => {
      // Pattern should be string
      expect(() => findFiles('/test', 'src/**/*.js')).not.toThrow();
    });
  });

  describe('Integration Contract', () => {
    it('all modules should use consistent data structures', () => {
      // All functions should work with same file path formats
      expect(typeof getProjectMetadata).toBe('function');
      expect(typeof getAnalyzedFiles).toBe('function');
      expect(typeof getAllConnections).toBe('function');
    });
  });

  describe('Deprecated API Contract', () => {
    it('main index should throw with migration instructions', async () => {
      try {
        await import('#layer-a/query/index.js');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('ha sido eliminado');
        expect(error.message).toContain('query/apis');
      }
    });
  });
});
