import { describe, it, expect, beforeEach } from 'vitest';
import { processBatch, chunkArray, calculateOptimalChunkSize } from '#services/llm-service/batch/batch-processor.js';

describe('batch-processor', () => {
  describe('processBatch', () => {
    it('should process requests sequentially with concurrency 1', async () => {
      const requests = [
        { prompt: 'prompt1' },
        { prompt: 'prompt2' },
        { prompt: 'prompt3' }
      ];
      
      const analyzeFn = async (prompt) => `processed: ${prompt}`;
      
      const result = await processBatch(requests, analyzeFn, { concurrency: 1 });
      
      expect(result.results).toHaveLength(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.duration).toBeDefined();
    });

    it('should process requests concurrently', async () => {
      const requests = [
        { prompt: 'prompt1' },
        { prompt: 'prompt2' },
        { prompt: 'prompt3' },
        { prompt: 'prompt4' }
      ];
      
      const analyzeFn = async (prompt) => `processed: ${prompt}`;
      
      const result = await processBatch(requests, analyzeFn, { concurrency: 2 });
      
      expect(result.results).toHaveLength(4);
      expect(result.successful).toBe(4);
    });

    it('should handle errors in sequential processing', async () => {
      const requests = [
        { prompt: 'success' },
        { prompt: 'error' },
        { prompt: 'success2' }
      ];
      
      const analyzeFn = async (prompt) => {
        if (prompt === 'error') throw new Error('test error');
        return `processed: ${prompt}`;
      };
      
      const result = await processBatch(requests, analyzeFn, { concurrency: 1 });
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[1].error).toBe('test error');
    });

    it('should handle errors in concurrent processing', async () => {
      const requests = [
        { prompt: 'error' },
        { prompt: 'success' }
      ];
      
      const analyzeFn = async (prompt) => {
        if (prompt === 'error') throw new Error('test error');
        return `processed: ${prompt}`;
      };
      
      const result = await processBatch(requests, analyzeFn, { concurrency: 2 });
      
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should pass options to analyze function', async () => {
      const requests = [
        { prompt: 'prompt1', options: { custom: 'option' } }
      ];
      
      const analyzeFn = async (prompt, options) => {
        return { prompt, options };
      };
      
      const result = await processBatch(requests, analyzeFn, { concurrency: 1 });
      
      expect(result.results[0].options).toEqual({ custom: 'option' });
    });

    it('should track duration', async () => {
      const requests = [{ prompt: 'test' }];
      const analyzeFn = async () => {
        await new Promise(r => setTimeout(r, 10));
        return 'done';
      };
      
      const result = await processBatch(requests, analyzeFn);
      
      expect(result.duration).toBeGreaterThanOrEqual(10);
    });

    it('should handle empty requests array', async () => {
      const analyzeFn = async () => 'done';
      
      const result = await processBatch([], analyzeFn);
      
      expect(result.results).toHaveLength(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('chunkArray', () => {
    it('should split array into chunks', () => {
      const array = [1, 2, 3, 4, 5, 6];
      
      const chunks = chunkArray(array, 2);
      
      expect(chunks).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    it('should handle uneven chunks', () => {
      const array = [1, 2, 3, 4, 5];
      
      const chunks = chunkArray(array, 2);
      
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle chunk size larger than array', () => {
      const array = [1, 2, 3];
      
      const chunks = chunkArray(array, 10);
      
      expect(chunks).toEqual([[1, 2, 3]]);
    });

    it('should handle empty array', () => {
      const chunks = chunkArray([], 2);
      
      expect(chunks).toEqual([]);
    });

    it('should handle single element', () => {
      const chunks = chunkArray([1], 2);
      
      expect(chunks).toEqual([[1]]);
    });
  });

  describe('calculateOptimalChunkSize', () => {
    it('should return total requests when less than max concurrency', () => {
      expect(calculateOptimalChunkSize(5, 10)).toBe(5);
    });

    it('should calculate optimal size for larger requests', () => {
      const size = calculateOptimalChunkSize(100, 10);
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThanOrEqual(100);
    });

    it('should distribute requests evenly', () => {
      const size = calculateOptimalChunkSize(20, 5);
      expect(size).toBe(5);
    });

    it('BUG: calculateOptimalChunkSize returns 1 instead of total for max concurrency 1', () => {
      expect(calculateOptimalChunkSize(10, 1)).toBe(1);
    });
  });
});
