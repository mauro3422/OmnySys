/**
 * @fileoverview atomic-checker.test.js
 * 
 * Tests for atomic checker module.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/mitigation/atomic-checker
 */

import { describe, it, expect } from 'vitest';
import {
  isAtomicOperation,
  getAtomicDetails
} from '#layer-a/race-detector/mitigation/atomic-checker.js';

describe('Atomic Checker', () => {
  describe('Structure Contract', () => {
    it('should export isAtomicOperation function', () => {
      expect(isAtomicOperation).toBeDefined();
      expect(typeof isAtomicOperation).toBe('function');
    });

    it('should export getAtomicDetails function', () => {
      expect(getAtomicDetails).toBeDefined();
      expect(typeof getAtomicDetails).toBe('function');
    });
  });

  describe('isAtomicOperation', () => {
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
      
      expect(isAtomicOperation(access, project)).toBe(false);
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
      
      expect(isAtomicOperation(access, project)).toBe(false);
    });

    describe('Atomics API patterns', () => {
      const atomicsOps = ['add', 'sub', 'and', 'or', 'xor', 'exchange', 'compareExchange', 'load', 'store'];
      
      atomicsOps.forEach(op => {
        it(`should detect Atomics.${op}`, () => {
          const access = { atom: 'atom-1' };
          const project = createMockProject(`Atomics.${op}(array, 0, 1)`);
          
          expect(isAtomicOperation(access, project)).toBe(true);
        });
      });
    });

    describe('Database atomic patterns', () => {
      it('should detect findOneAndUpdate', () => {
        const access = { atom: 'atom-1' };
        const project = createMockProject('db.collection.findOneAndUpdate({ id: 1 }, { $set: { value: 2 } })');
        
        expect(isAtomicOperation(access, project)).toBe(true);
      });

      it('should detect findOneAndReplace', () => {
        const access = { atom: 'atom-1' };
        const project = createMockProject('db.collection.findOneAndReplace({ id: 1 }, { value: 2 })');
        
        expect(isAtomicOperation(access, project)).toBe(true);
      });

      it('should detect findOneAndDelete', () => {
        const access = { atom: 'atom-1' };
        const project = createMockProject('db.collection.findOneAndDelete({ id: 1 })');
        
        expect(isAtomicOperation(access, project)).toBe(true);
      });

      it('should detect UPSERT', () => {
        const access = { atom: 'atom-1' };
        const project = createMockProject('INSERT INTO table VALUES (1) ON CONFLICT UPSERT');
        
        expect(isAtomicOperation(access, project)).toBe(true);
      });

      it('should detect ON CONFLICT', () => {
        const access = { atom: 'atom-1' };
        const project = createMockProject('INSERT INTO table VALUES (1) ON CONFLICT DO NOTHING');
        
        expect(isAtomicOperation(access, project)).toBe(true);
      });

      it('should detect INSERT OR REPLACE', () => {
        const access = { atom: 'atom-1' };
        const project = createMockProject('INSERT OR REPLACE INTO table VALUES (1)');
        
        expect(isAtomicOperation(access, project)).toBe(true);
      });
    });

    describe('Primitive operations', () => {
      it('should detect single-line sync primitive operation', () => {
        const access = { atom: 'atom-1', isAsync: false };
        const project = createMockProject('counter += 1');
        
        expect(isAtomicOperation(access, project)).toBe(true);
      });

      it('should detect single-line sync subtraction', () => {
        const access = { atom: 'atom-1', isAsync: false };
        const project = createMockProject('counter -= 1');
        
        expect(isAtomicOperation(access, project)).toBe(true);
      });

      it('should detect single-line sync multiplication', () => {
        const access = { atom: 'atom-1', isAsync: false };
        const project = createMockProject('value *= 2');
        
        expect(isAtomicOperation(access, project)).toBe(true);
      });

      it('should detect single-line sync division', () => {
        const access = { atom: 'atom-1', isAsync: false };
        const project = createMockProject('value /= 2');
        
        expect(isAtomicOperation(access, project)).toBe(true);
      });

      it('should not consider multi-line operations as atomic', () => {
        const access = { atom: 'atom-1', isAsync: false };
        const project = createMockProject('const temp = counter;\ncounter = temp + 1');
        
        expect(isAtomicOperation(access, project)).toBe(false);
      });

      it('should not consider async operations as atomic primitive', () => {
        const access = { atom: 'atom-1', isAsync: true };
        const project = createMockProject('counter += 1');
        
        expect(isAtomicOperation(access, project)).toBe(false);
      });
    });

    it('should return false for non-atomic operation', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject('sharedArray.push(value)');
      
      expect(isAtomicOperation(access, project)).toBe(false);
    });

    it('should return false for complex operations', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const temp = sharedVar;
        process(temp);
        sharedVar = temp + 1;
      `);
      
      expect(isAtomicOperation(access, project)).toBe(false);
    });
  });

  describe('getAtomicDetails', () => {
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
      
      expect(getAtomicDetails(access, project)).toBeNull();
    });

    it('should return atomics-api details for Atomics operation', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject('Atomics.add(array, 0, 1)');
      
      const details = getAtomicDetails(access, project);
      expect(details).not.toBeNull();
      expect(details).toHaveProperty('type', 'atomics-api');
      expect(details).toHaveProperty('operation', 'add');
      expect(details).toHaveProperty('confidence', 'high');
    });

    it('should return db-atomic details for database operation', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject('db.collection.findOneAndUpdate({}, {})');
      
      const details = getAtomicDetails(access, project);
      expect(details).not.toBeNull();
      expect(details).toHaveProperty('type', 'db-atomic');
      expect(details).toHaveProperty('confidence', 'high');
    });

    it('should return null for non-atomic operation', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject('regularOperation()');
      
      expect(getAtomicDetails(access, project)).toBeNull();
    });

    it('should extract correct Atomics operation', () => {
      const operations = ['load', 'store', 'add', 'sub', 'and', 'or', 'xor', 'exchange', 'compareExchange'];
      
      operations.forEach(op => {
        const access = { atom: 'atom-1' };
        const project = createMockProject(`Atomics.${op}(arr, 0, val)`);
        
        const details = getAtomicDetails(access, project);
        expect(details).not.toBeNull();
        expect(details.operation).toBe(op);
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle null access', () => {
      const project = { modules: [] };
      expect(() => isAtomicOperation(null, project)).not.toThrow();
    });

    it('should handle undefined access', () => {
      const project = { modules: [] };
      expect(() => isAtomicOperation(undefined, project)).not.toThrow();
    });

    it('should handle null project', () => {
      const access = { atom: 'atom-1' };
      expect(() => isAtomicOperation(access, null)).not.toThrow();
      expect(isAtomicOperation(access, null)).toBe(false);
    });

    it('should handle project without modules', () => {
      const access = { atom: 'atom-1' };
      expect(() => isAtomicOperation(access, {})).not.toThrow();
    });

    it('should handle access without atom property', () => {
      const project = { modules: [] };
      expect(() => isAtomicOperation({}, project)).not.toThrow();
    });

    it('should handle getAtomicDetails with null access', () => {
      const project = { modules: [] };
      expect(() => getAtomicDetails(null, project)).not.toThrow();
    });

    it('should handle getAtomicDetails with null project', () => {
      const access = { atom: 'atom-1' };
      expect(() => getAtomicDetails(access, null)).not.toThrow();
      expect(getAtomicDetails(access, null)).toBeNull();
    });

    it('should handle access with isAsync undefined', () => {
      const access = { atom: 'atom-1' };
      const project = {
        modules: [{
          files: [{
            atoms: [{
              id: 'atom-1',
              code: 'counter += 1'
            }]
          }]
        }]
      };
      
      expect(() => isAtomicOperation(access, project)).not.toThrow();
    });
  });
});
