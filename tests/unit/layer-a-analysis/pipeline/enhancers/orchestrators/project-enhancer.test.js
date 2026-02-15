/**
 * @fileoverview project-enhancer.test.js
 * 
 * Tests for Project Enhancer
 * Tests runProjectEnhancers
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/orchestrators
 */

import { describe, it, expect, vi } from 'vitest';
import { runProjectEnhancers } from '#layer-a/pipeline/enhancers/orchestrators/project-enhancer.js';

// Mock dependencies
vi.mock('#layer-a/pipeline/enhancers/connection-enricher.js', () => ({
  enrichConnections: vi.fn(() => Promise.resolve({
    connections: [],
    conflicts: [],
    stats: {}
  }))
}));

describe('Project Enhancer', () => {
  describe('runProjectEnhancers', () => {
    it('should return connections and metadata', async () => {
      const allAtoms = [{ id: 'atom-1' }];
      const projectMetadata = { totalFiles: 1 };

      const result = await runProjectEnhancers(allAtoms, projectMetadata);

      expect(result).toHaveProperty('connections');
      expect(result).toHaveProperty('metadata');
    });

    it('should include enhancedAt timestamp', async () => {
      const allAtoms = [{ id: 'atom-1' }];
      const projectMetadata = { totalFiles: 1 };

      const result = await runProjectEnhancers(allAtoms, projectMetadata);

      expect(result.metadata.enhancedAt).toBeDefined();
      expect(typeof result.metadata.enhancedAt).toBe('string');
    });

    it('should include duration', async () => {
      const allAtoms = [{ id: 'atom-1' }];
      const projectMetadata = { totalFiles: 1 };

      const result = await runProjectEnhancers(allAtoms, projectMetadata);

      expect(result.metadata.duration).toBeDefined();
      expect(typeof result.metadata.duration).toBe('number');
    });

    it('should include atom count', async () => {
      const allAtoms = [{ id: '1' }, { id: '2' }];
      const projectMetadata = { totalFiles: 1 };

      const result = await runProjectEnhancers(allAtoms, projectMetadata);

      expect(result.metadata.atomCount).toBe(2);
    });

    it('should call enrichConnections with atoms', async () => {
      const { enrichConnections } = await import('#layer-a/pipeline/enhancers/connection-enricher.js');
      const allAtoms = [{ id: 'atom-1' }];
      const projectMetadata = { totalFiles: 1 };

      await runProjectEnhancers(allAtoms, projectMetadata);

      expect(enrichConnections).toHaveBeenCalledWith(allAtoms, {});
    });

    it('should return enriched connections', async () => {
      const { enrichConnections } = await import('#layer-a/pipeline/enhancers/connection-enricher.js');
      const enrichedResult = {
        connections: [{ id: 'conn-1' }],
        conflicts: [],
        stats: { total: 1 }
      };
      enrichConnections.mockResolvedValueOnce(enrichedResult);

      const allAtoms = [{ id: 'atom-1' }];
      const projectMetadata = { totalFiles: 1 };

      const result = await runProjectEnhancers(allAtoms, projectMetadata);

      expect(result.connections).toEqual(enrichedResult);
    });

    it('should handle errors gracefully', async () => {
      const { enrichConnections } = await import('#layer-a/pipeline/enhancers/connection-enricher.js');
      enrichConnections.mockRejectedValueOnce(new Error('Enhancement failed'));

      const allAtoms = [{ id: 'atom-1' }];
      const projectMetadata = { totalFiles: 1 };

      const result = await runProjectEnhancers(allAtoms, projectMetadata);

      // Should not throw
      expect(result).toHaveProperty('connections');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.error).toBeDefined();
    });

    it('should return empty structure on error', async () => {
      const { enrichConnections } = await import('#layer-a/pipeline/enhancers/connection-enricher.js');
      enrichConnections.mockRejectedValueOnce(new Error('Enhancement failed'));

      const allAtoms = [{ id: 'atom-1' }];
      const projectMetadata = { totalFiles: 1 };

      const result = await runProjectEnhancers(allAtoms, projectMetadata);

      expect(result.connections).toHaveProperty('connections');
      expect(result.connections).toHaveProperty('conflicts');
      expect(result.connections).toHaveProperty('stats');
    });

    it('should handle empty atoms array', async () => {
      const allAtoms = [];
      const projectMetadata = { totalFiles: 0 };

      const result = await runProjectEnhancers(allAtoms, projectMetadata);

      expect(result.connections).toBeDefined();
      expect(result.metadata.atomCount).toBe(0);
    });

    it('should handle undefined options', async () => {
      const { enrichConnections } = await import('#layer-a/pipeline/enhancers/connection-enricher.js');
      const allAtoms = [{ id: 'atom-1' }];
      const projectMetadata = { totalFiles: 1 };

      await runProjectEnhancers(allAtoms, projectMetadata);

      expect(enrichConnections).toHaveBeenCalled();
    });
  });
});
