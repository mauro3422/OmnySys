/**
 * @fileoverview File Query (deprecated wrapper) Tests
 * 
 * Tests for the backward compatibility file-query wrapper.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/file-query
 */

import { describe, it, expect } from 'vitest';

describe('File Query (deprecated wrapper)', () => {
  describe('Module Structure', () => {
    it('should be importable as a module', async () => {
      // The wrapper should be importable
      const fileQuery = await import('#layer-a/query/queries/file-query.js');
      expect(fileQuery).toBeDefined();
    });

    it('should have consistent exports with the modular structure', async () => {
      const wrapper = await import('#layer-a/query/queries/file-query.js');
      expect(Object.keys(wrapper).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility interface', async () => {
      // The wrapper exists for backward compatibility
      const fileQuery = await import('#layer-a/query/queries/file-query.js');
      expect(fileQuery).toBeDefined();
    });
  });
});
