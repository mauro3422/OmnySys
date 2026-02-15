/**
 * @fileoverview metadata-enhancer.test.js
 * 
 * Tests for Metadata Enhancer
 * Tests enhanceMetadata
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/metadata-enhancer
 */

import { describe, it, expect, vi } from 'vitest';
import { enhanceMetadata } from '#layer-a/pipeline/enhancers/metadata-enhancer.js';

// Mock dependencies
vi.mock('#layer-b/semantic/validators/lineage-validator.js', () => ({
  validateForLineage: vi.fn(() => ({ valid: true, confidence: 0.9 }))
}));

describe('Metadata Enhancer', () => {
  describe('enhanceMetadata', () => {
    it('should return context with atoms', async () => {
      const context = {
        atoms: [{ id: 'atom-1' }],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms).toBeDefined();
      expect(result.atoms).toHaveLength(1);
    });

    it('should add _meta.validation to atoms with DNA', async () => {
      const context = {
        atoms: [{ id: 'atom-1', dna: { signature: 'test' } }],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms[0]._meta).toBeDefined();
      expect(result.atoms[0]._meta.validation).toBeDefined();
    });

    it('should add metrics to atoms', async () => {
      const context = {
        atoms: [{ id: 'atom-1', complexity: 5, linesOfCode: 10 }],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms[0].metrics).toBeDefined();
    });

    it('should add temporal summary when temporal patterns exist', async () => {
      const context = {
        atoms: [{
          id: 'atom-1',
          temporal: {
            patterns: {
              initialization: ['init'],
              lifecycleHooks: [],
              timers: [],
              asyncPatterns: {}
            }
          }
        }],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms[0].temporal.summary).toBeDefined();
    });

    it('should calculate connectionDensity in metrics', async () => {
      const context = {
        atoms: [{
          id: 'atom-1',
          linesOfCode: 10,
          calls: ['a', 'b'],
          calledBy: ['c']
        }],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms[0].metrics.connectionDensity).toBeDefined();
    });

    it('should calculate normalizedComplexity in metrics', async () => {
      const context = {
        atoms: [{
          id: 'atom-1',
          complexity: 10
        }],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms[0].metrics.normalizedComplexity).toBeDefined();
      expect(result.atoms[0].metrics.normalizedComplexity).toBeLessThanOrEqual(1);
    });

    it('should calculate sideEffectRatio in metrics', async () => {
      const context = {
        atoms: [{
          id: 'atom-1',
          hasNetworkCalls: true,
          hasSideEffects: true
        }],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms[0].metrics.sideEffectRatio).toBeDefined();
    });

    it('should calculate criticalityScore in metrics', async () => {
      const context = {
        atoms: [{
          id: 'atom-1',
          complexity: 10,
          isExported: true
        }],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms[0].metrics.criticalityScore).toBeDefined();
      expect(result.atoms[0].metrics.criticalityScore).toBeGreaterThanOrEqual(0);
      expect(result.atoms[0].metrics.criticalityScore).toBeLessThanOrEqual(1);
    });

    it('should add checkedAt timestamp to validation', async () => {
      const context = {
        atoms: [{ id: 'atom-1', dna: {} }],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms[0]._meta.validation.checkedAt).toBeDefined();
    });

    it('should handle atoms without DNA gracefully', async () => {
      const context = {
        atoms: [{ id: 'atom-1' }],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms[0]._meta).toBeUndefined();
    });

    it('should process multiple atoms', async () => {
      const context = {
        atoms: [
          { id: 'atom-1', complexity: 5 },
          { id: 'atom-2', complexity: 10 }
        ],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms).toHaveLength(2);
      expect(result.atoms[0].metrics).toBeDefined();
      expect(result.atoms[1].metrics).toBeDefined();
    });

    it('should handle empty atoms array', async () => {
      const context = {
        atoms: [],
        filePath: 'test.js'
      };

      const result = await enhanceMetadata(context);

      expect(result.atoms).toEqual([]);
    });
  });
});
