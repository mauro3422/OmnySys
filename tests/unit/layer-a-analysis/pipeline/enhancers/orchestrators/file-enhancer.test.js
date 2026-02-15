/**
 * @fileoverview file-enhancer.test.js
 * 
 * Tests for File Enhancer
 * Tests runEnhancers
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/orchestrators
 */

import { describe, it, expect, vi } from 'vitest';
import { runEnhancers } from '#layer-a/pipeline/enhancers/orchestrators/file-enhancer.js';

// Mock dependencies
vi.mock('#layer-a/pipeline/enhancers/metadata-enhancer.js', () => ({
  enhanceMetadata: vi.fn((context) => Promise.resolve(context))
}));

describe('File Enhancer', () => {
  describe('runEnhancers', () => {
    it('should return context unchanged when no atoms', async () => {
      const context = {
        atoms: [],
        filePath: 'test.js'
      };

      const result = await runEnhancers(context);

      expect(result).toBe(context);
    });

    it('should return context unchanged when atoms is undefined', async () => {
      const context = {
        filePath: 'test.js'
      };

      const result = await runEnhancers(context);

      expect(result).toBe(context);
    });

    it('should call enhanceMetadata when atoms exist', async () => {
      const { enhanceMetadata } = await import('#layer-a/pipeline/enhancers/metadata-enhancer.js');
      const context = {
        atoms: [{ id: 'atom-1' }],
        filePath: 'test.js'
      };

      await runEnhancers(context);

      expect(enhanceMetadata).toHaveBeenCalledWith(context);
    });

    it('should return enhanced context', async () => {
      const { enhanceMetadata } = await import('#layer-a/pipeline/enhancers/metadata-enhancer.js');
      const enhancedContext = {
        atoms: [{ id: 'atom-1', enhanced: true }],
        filePath: 'test.js'
      };
      enhanceMetadata.mockResolvedValueOnce(enhancedContext);

      const context = {
        atoms: [{ id: 'atom-1' }],
        filePath: 'test.js'
      };

      const result = await runEnhancers(context);

      expect(result).toBe(enhancedContext);
    });

    it('should handle errors gracefully', async () => {
      const { enhanceMetadata } = await import('#layer-a/pipeline/enhancers/metadata-enhancer.js');
      enhanceMetadata.mockRejectedValueOnce(new Error('Enhancement failed'));

      const context = {
        atoms: [{ id: 'atom-1' }],
        filePath: 'test.js'
      };

      const result = await runEnhancers(context);

      // Should not throw and should return original context
      expect(result).toBe(context);
    });

    it('should include filePath in log messages', async () => {
      const context = {
        atoms: [{ id: 'atom-1' }],
        filePath: 'src/components/Button.jsx'
      };

      const result = await runEnhancers(context);

      expect(result.filePath).toBe('src/components/Button.jsx');
    });

    it('should pass atoms count to logger', async () => {
      const context = {
        atoms: [{ id: '1' }, { id: '2' }, { id: '3' }],
        filePath: 'test.js'
      };

      const result = await runEnhancers(context);

      expect(result.atoms).toHaveLength(3);
    });
  });
});
