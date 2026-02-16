/**
 * @fileoverview immutable-checker.test.js
 * 
 * Tests for immutable checker module.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/mitigation/immutable-checker
 */

import { describe, it, expect } from 'vitest';
import {
  usesImmutableData,
  getImmutableDetails
} from '#layer-a/race-detector/mitigation/immutable-checker.js';

describe('Immutable Checker', () => {
  describe('Structure Contract', () => {
    it('should export usesImmutableData function', () => {
      expect(usesImmutableData).toBeDefined();
      expect(typeof usesImmutableData).toBe('function');
    });

    it('should export getImmutableDetails function', () => {
      expect(getImmutableDetails).toBeDefined();
      expect(typeof getImmutableDetails).toBe('function');
    });
  });

  describe('usesImmutableData', () => {
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
      
      expect(usesImmutableData(access, project)).toBe(false);
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
      
      expect(usesImmutableData(access, project)).toBe(false);
    });

    it('should detect Immutable. pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const list = Immutable.List([1, 2, 3]);
        const newList = list.push(4);
      `);
      
      expect(usesImmutableData(access, project)).toBe(true);
    });

    it('should detect .asMutable() pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const mutable = immutableMap.asMutable();
      `);
      
      expect(usesImmutableData(access, project)).toBe(true);
    });

    it('should detect .asImmutable() pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        map.asImmutable();
      `);
      
      expect(usesImmutableData(access, project)).toBe(true);
    });

    it('should detect Object.freeze() pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const frozen = Object.freeze({ value: 1 });
      `);
      
      expect(usesImmutableData(access, project)).toBe(true);
    });

    it('should detect Readonly< type', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        type Config = Readonly<{
          value: number;
        }>;
      `);
      
      expect(usesImmutableData(access, project)).toBe(true);
    });

    it('should detect immer import', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        import produce from "immer";
      `);
      
      expect(usesImmutableData(access, project)).toBe(true);
    });

    it('should detect produce function', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const nextState = produce(state, draft => {
          draft.value = 2;
        });
      `);
      
      expect(usesImmutableData(access, project)).toBe(true);
    });

    it('should return false for mutable operations', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        array.push(value);
        object.prop = newValue;
      `);
      
      expect(usesImmutableData(access, project)).toBe(false);
    });
  });

  describe('getImmutableDetails', () => {
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
      
      expect(getImmutableDetails(access, project)).toBeNull();
    });

    it('should return immutable-js details', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        const map = Immutable.Map();
      `);
      
      const details = getImmutableDetails(access, project);
      expect(details).not.toBeNull();
      expect(details).toHaveProperty('type', 'immutable');
      expect(details).toHaveProperty('library', 'immutable-js');
      expect(details).toHaveProperty('confidence', 'medium');
    });

    it('should return immer details', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        produce(state, draft => {});
      `);
      
      const details = getImmutableDetails(access, project);
      expect(details).not.toBeNull();
      expect(details).toHaveProperty('library', 'immer');
    });

    it('should return native-freeze details', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        Object.freeze(obj);
      `);
      
      const details = getImmutableDetails(access, project);
      expect(details).not.toBeNull();
      expect(details).toHaveProperty('library', 'native-freeze');
    });

    it('should return typescript-readonly details', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        type T = Readonly<Props>;
      `);
      
      const details = getImmutableDetails(access, project);
      expect(details).not.toBeNull();
      expect(details).toHaveProperty('library', 'typescript-readonly');
    });

    it('should return null for no immutable pattern', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        regularCode();
      `);
      
      expect(getImmutableDetails(access, project)).toBeNull();
    });

    it('should return first matching library', () => {
      const access = { atom: 'atom-1' };
      const project = createMockProject(`
        Immutable.Map();
        produce(state, draft => {});
      `);
      
      const details = getImmutableDetails(access, project);
      expect(details).not.toBeNull();
      expect(details.library).toBeDefined();
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle null access', () => {
      const project = { modules: [] };
      expect(() => usesImmutableData(null, project)).not.toThrow();
    });

    it('should handle undefined access', () => {
      const project = { modules: [] };
      expect(() => usesImmutableData(undefined, project)).not.toThrow();
    });

    it('should handle null project', () => {
      const access = { atom: 'atom-1' };
      expect(() => usesImmutableData(access, null)).not.toThrow();
      expect(usesImmutableData(access, null)).toBe(false);
    });

    it('should handle project without modules', () => {
      const access = { atom: 'atom-1' };
      expect(() => usesImmutableData(access, {})).not.toThrow();
    });

    it('should handle access without atom property', () => {
      const project = { modules: [] };
      expect(() => usesImmutableData({}, project)).not.toThrow();
    });

    it('should handle getImmutableDetails with null access', () => {
      const project = { modules: [] };
      expect(() => getImmutableDetails(null, project)).not.toThrow();
    });

    it('should handle getImmutableDetails with null project', () => {
      const access = { atom: 'atom-1' };
      expect(() => getImmutableDetails(access, null)).not.toThrow();
      expect(getImmutableDetails(access, null)).toBeNull();
    });

    it('should handle circular reference in code', () => {
      const circularCode = 'const obj = {}; obj.self = obj;';
      const access = { atom: 'atom-1' };
      const project = {
        modules: [{
          files: [{
            atoms: [{
              id: 'atom-1',
              code: circularCode
            }]
          }]
        }]
      };
      
      expect(() => usesImmutableData(access, project)).not.toThrow();
    });
  });
});
