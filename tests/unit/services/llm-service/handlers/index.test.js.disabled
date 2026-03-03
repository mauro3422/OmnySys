import { describe, it, expect } from 'vitest';
import * as handlers from '#services/llm-service/handlers/index.js';

describe('handlers/index.js', () => {
  describe('exports', () => {
    it('should export RequestHandler', () => {
      expect(handlers.RequestHandler).toBeDefined();
      expect(typeof handlers.RequestHandler).toBe('function');
    });

    it('should export ValidationResult', () => {
      expect(handlers.ValidationResult).toBeDefined();
      expect(typeof handlers.ValidationResult).toBe('function');
    });

    it('should export ResponseHandler', () => {
      expect(handlers.ResponseHandler).toBeDefined();
      expect(typeof handlers.ResponseHandler).toBe('function');
    });

    it('should export ProcessedResponse', () => {
      expect(handlers.ProcessedResponse).toBeDefined();
      expect(typeof handlers.ProcessedResponse).toBe('function');
    });
  });
});
