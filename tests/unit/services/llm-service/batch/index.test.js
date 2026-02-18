import { describe, it, expect } from 'vitest';
import * as batch from '#services/llm-service/batch/index.js';

describe('batch/index.js', () => {
  describe('exports', () => {
    it('should export processBatch', () => {
      expect(batch.processBatch).toBeDefined();
      expect(typeof batch.processBatch).toBe('function');
    });

    it('should export chunkArray', () => {
      expect(batch.chunkArray).toBeDefined();
      expect(typeof batch.chunkArray).toBe('function');
    });

    it('should export calculateOptimalChunkSize', () => {
      expect(batch.calculateOptimalChunkSize).toBeDefined();
      expect(typeof batch.calculateOptimalChunkSize).toBe('function');
    });
  });
});
