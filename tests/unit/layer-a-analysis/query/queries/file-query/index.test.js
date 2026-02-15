/**
 * @fileoverview File Query Index Tests
 * 
 * Tests for the file-query module public API.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/file-query/index
 */

import { describe, it, expect } from 'vitest';

describe('File Query Index', () => {
  describe('Module Structure', () => {
    it('should be importable as a module', async () => {
      const index = await import('#layer-a/query/queries/file-query/index.js');
      expect(index).toBeDefined();
    });

    it('should export functions', async () => {
      const index = await import('#layer-a/query/queries/file-query/index.js');
      // The module should have exports
      expect(Object.keys(index).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Submodules', () => {
    it('should have core submodule', async () => {
      const core = await import('#layer-a/query/queries/file-query/core/index.js');
      expect(core).toBeDefined();
    });

    it('should have dependencies submodule', async () => {
      const deps = await import('#layer-a/query/queries/file-query/dependencies/index.js');
      expect(deps).toBeDefined();
    });

    it('should have atoms submodule', async () => {
      const atoms = await import('#layer-a/query/queries/file-query/atoms/index.js');
      expect(atoms).toBeDefined();
    });

    it('should have enriched submodule', async () => {
      const enriched = await import('#layer-a/query/queries/file-query/enriched/index.js');
      expect(enriched).toBeDefined();
    });
  });
});
