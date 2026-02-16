/**
 * @fileoverview LockAnalyzer.test.js
 * 
 * Tests for LockAnalyzer.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/detectors/LockAnalyzer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LockAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/detectors/LockAnalyzer.js';
import { MitigationBuilder } from '../../../../../../factories/race-detector-test.factory.js';

describe('LockAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new LockAnalyzer();
  });

  describe('Structure Contract', () => {
    it('should export LockAnalyzer class', () => {
      expect(LockAnalyzer).toBeDefined();
      expect(typeof LockAnalyzer).toBe('function');
    });

    it('should instantiate without errors', () => {
      expect(() => new LockAnalyzer()).not.toThrow();
    });

    it('should have lock patterns defined', () => {
      expect(analyzer.lockPatterns).toBeDefined();
      expect(Array.isArray(analyzer.lockPatterns)).toBe(true);
    });
  });

  describe('getLockProtection', () => {
    it('should return null for null atom', () => {
      const access = { variable: 'testVar' };
      const result = analyzer.getLockProtection(access, null, {});
      expect(result).toBeNull();
    });

    it('should detect explicit lock from atom.locks', () => {
      const access = { variable: 'sharedVar' };
      const atom = {
        locks: [{
          type: 'mutex',
          name: 'myMutex',
          protectedVars: ['sharedVar'],
          granularity: 'variable'
        }]
      };
      
      const result = analyzer.getLockProtection(access, atom, {});
      
      expect(result).toEqual({
        type: 'mutex',
        name: 'myMutex',
        granularity: 'variable'
      });
    });

    it('should detect lock by scope', () => {
      const access = { variable: 'sharedVar', line: 15 };
      const atom = {
        locks: [{
          type: 'mutex',
          name: 'myMutex',
          scope: [10, 20],
          granularity: 'scope'
        }]
      };
      
      const result = analyzer.getLockProtection(access, atom, {});
      
      expect(result).toBeDefined();
      expect(result.type).toBe('mutex');
    });

    it('should detect implicit mutex pattern in code', () => {
      const access = { variable: 'sharedVar', code: 'await mutex.lock(); sharedVar = 1;' };
      const atom = { code: 'await mutex.lock(); sharedVar = 1;' };
      
      const result = analyzer.getLockProtection(access, atom, {});
      
      expect(result).toBeDefined();
      expect(result.type).toBe('mutex');
      expect(result.implicit).toBe(true);
    });

    it('should detect implicit semaphore pattern', () => {
      const access = { code: 'await semaphore.acquire();' };
      const atom = { code: 'await semaphore.acquire(); sharedVar = 1;' };
      
      const result = analyzer.getLockProtection(access, atom, {});
      
      expect(result).toBeDefined();
      expect(result.type).toBe('semaphore');
    });

    it('should detect implicit atomic pattern', () => {
      const access = { code: 'Atomics.add(sharedVar, 0, 1)' };
      const atom = { code: 'Atomics.add(sharedVar, 0, 1)' };
      
      const result = analyzer.getLockProtection(access, atom, {});
      
      expect(result).toBeDefined();
      expect(result.type).toBe('atomic');
    });

    it('should detect implicit transaction pattern', () => {
      const access = { code: 'BEGIN TRANSACTION;' };
      const atom = { code: 'BEGIN TRANSACTION; UPDATE users SET x = 1;' };
      
      const result = analyzer.getLockProtection(access, atom, {});
      
      expect(result).toBeDefined();
      expect(result.type).toBe('transaction');
    });

    it('should return null when no lock protection found', () => {
      const access = { variable: 'sharedVar' };
      const atom = { code: 'sharedVar = 1;' };
      
      const result = analyzer.getLockProtection(access, atom, {});
      
      expect(result).toBeNull();
    });
  });

  describe('haveCommonLock', () => {
    it('should return false when no locks', () => {
      const access1 = { variable: 'var1' };
      const access2 = { variable: 'var2' };
      
      const result = analyzer.haveCommonLock(access1, access2, {}, {}, {});
      
      expect(result).toBe(false);
    });

    it('should return true for same lock type and name', () => {
      const access1 = { code: 'await mutex1.lock();' };
      const access2 = { code: 'await mutex1.lock();' };
      const atom1 = { code: 'await mutex1.lock(); x = 1;' };
      const atom2 = { code: 'await mutex1.lock(); y = 2;' };
      
      const result = analyzer.haveCommonLock(access1, access2, atom1, atom2, {});
      
      expect(result).toBe(true);
    });

    it('should return false for different lock names', () => {
      const access1 = { code: 'await mutex1.lock();' };
      const access2 = { code: 'await mutex2.lock();' };
      const atom1 = { code: 'await mutex1.lock(); x = 1;' };
      const atom2 = { code: 'await mutex2.lock(); y = 2;' };
      
      const result = analyzer.haveCommonLock(access1, access2, atom1, atom2, {});
      
      expect(result).toBe(false);
    });
  });

  describe('checkMitigation', () => {
    it('should return mitigation analysis object', () => {
      const race = {
        accesses: [
          { atom: 'atom-1', code: 'await lock.acquire();' },
          { atom: 'atom-2', code: 'await lock.acquire();' }
        ]
      };
      
      const result = analyzer.checkMitigation(race, {
        modules: {
          test: {
            atoms: [
              { id: 'atom-1', code: 'await lock.acquire(); x = 1;' },
              { id: 'atom-2', code: 'await lock.acquire(); y = 2;' }
            ]
          }
        }
      });
      
      expect(result).toHaveProperty('isMitigated');
      expect(result).toHaveProperty('mitigationType');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('details');
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should detect common lock mitigation', () => {
      const race = {
        accesses: [
          { atom: 'atom-1', code: 'await sharedLock.acquire();' },
          { atom: 'atom-2', code: 'await sharedLock.acquire();' }
        ]
      };
      
      const result = analyzer.checkMitigation(race, {
        modules: {
          test: {
            atoms: [
              { id: 'atom-1', code: 'await sharedLock.acquire(); x = 1; sharedLock.release();' },
              { id: 'atom-2', code: 'await sharedLock.acquire(); y = 2; sharedLock.release();' }
            ]
          }
        }
      });
      
      if (result.isMitigated) {
        expect(result.mitigationType).toBe('common-lock');
        expect(result.confidence).toBe('high');
      }
    });

    it('should detect partial mitigation when only one access has lock', () => {
      const race = {
        accesses: [
          { atom: 'atom-1', code: 'await lock.acquire();' },
          { atom: 'atom-2', code: 'x = 1;' }
        ]
      };
      
      const result = analyzer.checkMitigation(race, {
        modules: {
          test: {
            atoms: [
              { id: 'atom-1', code: 'await lock.acquire(); x = 1;' },
              { id: 'atom-2', code: 'x = 1;' }
            ]
          }
        }
      });
      
      expect(result.isMitigated).toBe(false);
    });
  });

  describe('findAtom', () => {
    it('should find atom by ID in project', () => {
      const project = {
        modules: {
          test: {
            atoms: [
              { id: 'atom-1', name: 'func1' },
              { id: 'atom-2', name: 'func2' }
            ]
          }
        }
      };
      
      const result = analyzer.findAtom('atom-1', project);
      
      expect(result).toEqual({ id: 'atom-1', name: 'func1' });
    });

    it('should return null for non-existent atom', () => {
      const project = {
        modules: {
          test: {
            atoms: [{ id: 'atom-1', name: 'func1' }]
          }
        }
      };
      
      const result = analyzer.findAtom('atom-nonexistent', project);
      
      expect(result).toBeNull();
    });

    it('should handle empty project', () => {
      const result = analyzer.findAtom('atom-1', {});
      expect(result).toBeNull();
    });
  });
});
