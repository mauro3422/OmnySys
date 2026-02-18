import { describe, it, expect } from 'vitest';
import * as singleton from '#services/llm-service/singleton/index.js';

describe('singleton/index.js', () => {
  describe('exports', () => {
    it('should export getSingletonInstance', () => {
      expect(singleton.getSingletonInstance).toBeDefined();
      expect(typeof singleton.getSingletonInstance).toBe('function');
    });

    it('should export resetSingleton', () => {
      expect(singleton.resetSingleton).toBeDefined();
      expect(typeof singleton.resetSingleton).toBe('function');
    });

    it('should export hasInstance', () => {
      expect(singleton.hasInstance).toBeDefined();
      expect(typeof singleton.hasInstance).toBe('function');
    });

    it('should export getCurrentInstance', () => {
      expect(singleton.getCurrentInstance).toBeDefined();
      expect(typeof singleton.getCurrentInstance).toBe('function');
    });
  });
});
