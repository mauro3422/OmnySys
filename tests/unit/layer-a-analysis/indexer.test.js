/**
 * @fileoverview Tests for indexer.js - Main Entry Point
 * 
 * Tests the indexProject function which orchestrates the entire analysis pipeline.
 */

import { describe, it, expect, vi } from 'vitest';

describe('indexer.js', () => {
  describe('indexProject', () => {
    it('should exist as a module', async () => {
      const indexer = await import('../../../src/layer-a-static/indexer.js');
      expect(indexer).toBeDefined();
      expect(typeof indexer.indexProject).toBe('function');
    });

    it('should have correct function signature', async () => {
      const { indexProject } = await import('../../../src/layer-a-static/indexer.js');
      expect(indexProject.length).toBe(2); // rootPath, options
    });
  });

  describe('Module Exports', () => {
    it('should export indexProject function', async () => {
      const indexer = await import('../../../src/layer-a-static/indexer.js');
      expect(indexer).toHaveProperty('indexProject');
    });
  });
});
