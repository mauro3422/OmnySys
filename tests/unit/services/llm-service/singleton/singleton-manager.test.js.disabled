import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSingletonInstance, resetSingleton, hasInstance, getCurrentInstance } from '#services/llm-service/singleton/singleton-manager.js';

describe('singleton-manager', () => {
  beforeEach(async () => {
    await resetSingleton();
  });

  afterEach(async () => {
    await resetSingleton();
  });

  describe('getSingletonInstance', () => {
    it('should create instance using factory', async () => {
      let factoryCalled = false;
      const factory = () => {
        factoryCalled = true;
        return { name: 'test', initialize: async () => true };
      };
      
      const instance = await getSingletonInstance(factory);
      
      expect(factoryCalled).toBe(true);
      expect(instance.name).toBe('test');
    });

    it('should return same instance on multiple calls', async () => {
      const factory = () => ({ id: Date.now(), initialize: async () => true });
      
      const instance1 = await getSingletonInstance(factory);
      const instance2 = await getSingletonInstance(factory);
      
      expect(instance1).toBe(instance2);
    });

    it('should handle concurrent initialization', async () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { 
          initialize: async () => {
            await new Promise(r => setTimeout(r, 50));
            return true;
          }
        };
      };
      
      const [instance1, instance2, instance3] = await Promise.all([
        getSingletonInstance(factory),
        getSingletonInstance(factory),
        getSingletonInstance(factory)
      ]);
      
      expect(callCount).toBe(1);
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('should call initialize on instance', async () => {
      let initialized = false;
      const factory = () => ({
        initialize: async () => {
          initialized = true;
          return true;
        }
      });
      
      await getSingletonInstance(factory);
      
      expect(initialized).toBe(true);
    });
  });

  describe('resetSingleton', () => {
    it('should clear instance', async () => {
      const factory = () => ({ name: 'test', initialize: async () => true });
      
      await getSingletonInstance(factory);
      await resetSingleton();
      
      expect(hasInstance()).toBe(false);
    });

    it('should call dispose function on existing instance', async () => {
      let disposed = false;
      const factory = () => ({
        name: 'test',
        initialize: async () => true
      });
      
      await getSingletonInstance(factory);
      await resetSingleton((instance) => {
        disposed = true;
      });
      
      expect(disposed).toBe(true);
    });

    it('should handle dispose errors gracefully', async () => {
      const factory = () => ({
        name: 'test',
        initialize: async () => true
      });
      
      await getSingletonInstance(factory);
      
      await expect(
        resetSingleton(() => { throw new Error('dispose error'); })
      ).resolves.not.toThrow();
    });

    it('should clear pending promise', async () => {
      const factory = () => ({ initialize: async () => true });
      
      const promise = getSingletonInstance(factory);
      await promise;
      await resetSingleton();
      
      expect(hasInstance()).toBe(false);
    });
  });

  describe('hasInstance', () => {
    it('should return false when no instance exists', () => {
      expect(hasInstance()).toBe(false);
    });

    it('should return true when instance exists', async () => {
      const factory = () => ({ initialize: async () => true });
      await getSingletonInstance(factory);
      
      expect(hasInstance()).toBe(true);
    });

    it('should return false after reset', async () => {
      const factory = () => ({ initialize: async () => true });
      await getSingletonInstance(factory);
      await resetSingleton();
      
      expect(hasInstance()).toBe(false);
    });
  });

  describe('getCurrentInstance', () => {
    it('should return null when no instance exists', () => {
      expect(getCurrentInstance()).toBeNull();
    });

    it('should return current instance', async () => {
      const factory = () => ({ name: 'test', initialize: async () => true });
      const created = await getSingletonInstance(factory);
      
      expect(getCurrentInstance()).toBe(created);
    });

    it('should not create new instance', async () => {
      expect(getCurrentInstance()).toBeNull();
    });
  });
});
