/**
 * @fileoverview Query Index Tests
 * 
 * Tests for the main query index deprecation handling.
 * 
 * @module tests/unit/layer-a-analysis/query/index
 */

import { describe, it, expect } from 'vitest';

describe('Query Index (Deprecated)', () => {
  describe('Structure Contract', () => {
    it('should throw when importing main index', async () => {
      let error;
      try {
        await import('#layer-a/query/index.js');
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeDefined();
      expect(error.message).toContain('ERROR');
    });

    it('error message should contain migration instructions', async () => {
      let error;
      try {
        await import('#layer-a/query/index.js');
      } catch (e) {
        error = e;
      }
      
      expect(error.message).toContain('query/apis');
      expect(error.message).toContain('project-api.js');
      expect(error.message).toContain('file-api.js');
    });

    it('error message should reference documentation', async () => {
      let error;
      try {
        await import('#layer-a/query/index.js');
      } catch (e) {
        error = e;
      }
      
      expect(error.message).toContain('.md');
    });
  });

  describe('Error Handling Contract', () => {
    it('should throw synchronously on import', async () => {
      const start = Date.now();
      
      try {
        await import('#layer-a/query/index.js');
        expect.fail('Should have thrown');
      } catch (e) {
        const duration = Date.now() - start;
        // Should throw quickly, not timeout
        expect(duration).toBeLessThan(1000);
      }
    });

    it('error should be an Error instance', async () => {
      try {
        await import('#layer-a/query/index.js');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBeTruthy();
      }
    });
  });

  describe('Migration Path', () => {
    it('should suggest project-api alternative', async () => {
      try {
        await import('#layer-a/query/index.js');
      } catch (e) {
        expect(e.message).toContain('project-api.js');
      }
    });

    it('should suggest file-api alternative', async () => {
      try {
        await import('#layer-a/query/index.js');
      } catch (e) {
        expect(e.message).toContain('file-api.js');
      }
    });

    it('should suggest dependency-api alternative', async () => {
      try {
        await import('#layer-a/query/index.js');
      } catch (e) {
        expect(e.message).toContain('dependency-api.js');
      }
    });

    it('should suggest connections-api alternative', async () => {
      try {
        await import('#layer-a/query/index.js');
      } catch (e) {
        expect(e.message).toContain('connections-api.js');
      }
    });

    it('should suggest risk-api alternative', async () => {
      try {
        await import('#layer-a/query/index.js');
      } catch (e) {
        expect(e.message).toContain('risk-api.js');
      }
    });

    it('should suggest export-api alternative', async () => {
      try {
        await import('#layer-a/query/index.js');
      } catch (e) {
        expect(e.message).toContain('export-api.js');
      }
    });
  });
});
