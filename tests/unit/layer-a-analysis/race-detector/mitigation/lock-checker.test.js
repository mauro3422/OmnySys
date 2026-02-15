/**
 * @fileoverview lock-checker.test.js
 * 
 * Tests for lock checker module.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/mitigation/lock-checker
 */

import { describe, it, expect } from 'vitest';
import {
  hasLockProtection,
  getLockDetails
} from '#layer-a/race-detector/mitigation/lock-checker.js';

describe('Lock Checker', () => {
  describe('Structure Contract', () => {
    it('should export hasLockProtection function', () => {
      expect(hasLockProtection).toBeDefined();
      expect(typeof hasLockProtection).toBe('function');
    });

    it('should export getLockDetails function', () => {
      expect(getLockDetails).toBeDefined();
      expect(typeof getLockDetails).toBe('function');
    });
  });

  describe('hasLockProtection', () => {
    const createMockProject = (code) => ({
      modules: [{
        files: [{
          atoms: [{
            id: 'atom-1',
            code
          }]
        }]
      }]
    });

    it('should return false when atom not found', () => {
      const access = { atom: 'nonexistent' };
      const project = { modules: [] };
      
      expect(hasLockProtection(access, project)).toBe(false);
    });

    it('should return false when atom has no code', () => {
      const access = { atom: 'atom-1' };
      const project = {
        modules: [{
          files: [{
            atoms: [{ id: 'atom-1' }]
          }]
        }]
      };
      
      expect(hasLockProtection(access, project)).toBe(false);
    });

    it('should detect mutex pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        await mutex.lock();
        sharedVar = value;
        mutex.unlock();
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect semaphore pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        semaphore.acquire();
        // critical section
        semaphore.release();
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect Lock constructor pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const lock = new Lock("myLock");
        await lock.acquire();
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect acquire function pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        resource.acquire(() => {
          // critical section
        });
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect withLock pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        await withLock(myLock, () => {
          sharedVar = value;
        });
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect await lock pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        await myLock.lock();
        criticalCode();
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect Atomics pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        Atomics.add(sharedArray, 0, 1);
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect navigator.locks pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        await navigator.locks.request("myResource", async lock => {
          // critical section
        });
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect async mutate pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        await queryClient.mutate({ mutationFn: updateData });
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect useMutation pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const mutation = useMutation(updateData);
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect FOR UPDATE pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect LOCK TABLES pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        LOCK TABLES accounts WRITE;
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect redis lock pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const lock = await redis.lock("resource");
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect redlock pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const redlock = new Redlock([redis]);
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect synchronized pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        synchronized(this) {
          sharedVar = value;
        }
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect @synchronized annotation', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        @synchronized
        updateShared() { }
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should detect ReentrantLock pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const lock = new ReentrantLock();
        lock.lock();
      `);
      
      expect(hasLockProtection(access, project)).toBe(true);
    });

    it('should return false when no lock pattern found', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        sharedVar = value;
      `);
      
      expect(hasLockProtection(access, project)).toBe(false);
    });
  });

  describe('getLockDetails', () => {
    const createMockProject = (code) => ({
      modules: [{
        files: [{
          atoms: [{
            id: 'atom-1',
            code
          }]
        }]
      }]
    });

    it('should return null when atom not found', () => {
      const access = { atom: 'nonexistent' };
      const project = { modules: [] };
      
      expect(getLockDetails(access, project)).toBeNull();
    });

    it('should return lock details object', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        await mutex.lock();
      `);
      
      const details = getLockDetails(access, project);
      expect(details).not.toBeNull();
      expect(details).toHaveProperty('type', 'lock');
      expect(details).toHaveProperty('pattern');
      expect(details).toHaveProperty('confidence', 'high');
    });

    it('should include matched pattern in details', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        semaphore.acquire();
      `);
      
      const details = getLockDetails(access, project);
      expect(details.pattern.toLowerCase()).toContain('semaphore');
    });

    it('should return null when no lock found', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        regularCode();
      `);
      
      expect(getLockDetails(access, project)).toBeNull();
    });

    it('should return first matching pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        await mutex.lock();
        semaphore.acquire();
      `);
      
      const details = getLockDetails(access, project);
      expect(details).not.toBeNull();
      expect(details.pattern).toBeDefined();
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle null access', () => {
      const project = { modules: [] };
      expect(() => hasLockProtection(null, project)).not.toThrow();
    });

    it('should handle undefined access', () => {
      const project = { modules: [] };
      expect(() => hasLockProtection(undefined, project)).not.toThrow();
    });

    it('should handle null project', () => {
      const access = { atom: 'atom-1' };
      expect(() => hasLockProtection(access, null)).not.toThrow();
      expect(hasLockProtection(access, null)).toBe(false);
    });

    it('should handle project without modules', () => {
      const access = { atom: 'atom-1' };
      expect(() => hasLockProtection(access, {})).not.toThrow();
    });

    it('should handle access without atom property', () => {
      const project = { modules: [] };
      expect(() => hasLockProtection({}, project)).not.toThrow();
    });

    it('should handle getLockDetails with null access', () => {
      const project = { modules: [] };
      expect(() => getLockDetails(null, project)).not.toThrow();
    });

    it('should handle getLockDetails with null project', () => {
      const access = { atom: 'atom-1' };
      expect(() => getLockDetails(access, null)).not.toThrow();
      expect(getLockDetails(access, null)).toBeNull();
    });
  });
});
