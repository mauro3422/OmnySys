import { describe, it, expect } from 'vitest';
import * as health from '#services/llm-service/health/index.js';

describe('health/index.js', () => {
  describe('exports', () => {
    it('should export HealthChecker', () => {
      expect(health.HealthChecker).toBeDefined();
      expect(typeof health.HealthChecker).toBe('function');
    });
  });
});
