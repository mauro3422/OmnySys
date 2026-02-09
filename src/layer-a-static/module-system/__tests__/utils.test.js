/**
 * @fileoverview Tests for module-system/utils.js
 * 
 * @module module-system/__tests__/utils
 */

import { describe, it, expect } from 'vitest';
import {
  findMolecule,
  getAllAtoms,
  camelToKebab,
  inferModuleFromCall,
  classifySideEffects,
  aggregateSideEffects
} from '../utils.js';

describe('module-system/utils', () => {
  describe('findMolecule', () => {
    it('should find molecule by file path', () => {
      const modules = [{
        molecules: [
          { filePath: 'src/api.js', atoms: [] },
          { filePath: 'src/utils.js', atoms: [] }
        ]
      }];
      
      const result = findMolecule('src/api.js', modules);
      
      expect(result).toBeDefined();
      expect(result.filePath).toBe('src/api.js');
    });
    
    it('should return null if molecule not found', () => {
      const modules = [{
        molecules: [{ filePath: 'src/other.js', atoms: [] }]
      }];
      
      const result = findMolecule('src/notfound.js', modules);
      
      expect(result).toBeNull();
    });
  });
  
  describe('getAllAtoms', () => {
    it('should get all atoms from a module', () => {
      const module = {
        files: [{ path: 'src/api.js' }],
        molecules: [{
          filePath: 'src/api.js',
          atoms: [
            { name: 'func1', id: 'src/api.js::func1' },
            { name: 'func2', id: 'src/api.js::func2' }
          ]
        }]
      };
      
      const result = getAllAtoms(module);
      
      expect(result).toHaveLength(2);
      expect(result[0].filePath).toBe('src/api.js');
    });
    
    it('should return empty array for module without files', () => {
      const module = { files: [] };
      
      const result = getAllAtoms(module);
      
      expect(result).toEqual([]);
    });
  });
  
  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('getUserData')).toBe('get-user-data');
      expect(camelToKebab('APIRequest')).toBe('apirequest');
      expect(camelToKebab('handleHTTPResponse')).toBe('handle-httpresponse');
    });
    
    it('should handle empty string', () => {
      expect(camelToKebab('')).toBe('');
    });
  });
  
  describe('inferModuleFromCall', () => {
    it('should infer database module from db.* calls', () => {
      expect(inferModuleFromCall('db.query')).toBe('database');
      expect(inferModuleFromCall('db.insert')).toBe('database');
    });
    
    it('should infer cache module from cache.* calls', () => {
      expect(inferModuleFromCall('cache.get')).toBe('cache');
      expect(inferModuleFromCall('cache.redis')).toBe('redis');
    });
    
    it('should return null for unknown calls', () => {
      expect(inferModuleFromCall('unknown.func')).toBeNull();
    });
  });
  
  describe('classifySideEffects', () => {
    it('should classify network side effects', () => {
      const atom = { hasNetworkCalls: true };
      
      const result = classifySideEffects(atom);
      
      expect(result).toContain('network');
    });
    
    it('should classify DOM side effects', () => {
      const atom = { hasDomManipulation: true };
      
      const result = classifySideEffects(atom);
      
      expect(result).toContain('dom');
    });
    
    it('should return multiple effects', () => {
      const atom = {
        hasNetworkCalls: true,
        hasStorageAccess: true,
        hasLogging: true
      };
      
      const result = classifySideEffects(atom);
      
      expect(result).toEqual(['network', 'storage', 'logging']);
    });
  });
  
  describe('aggregateSideEffects', () => {
    it('should aggregate side effects from steps', () => {
      const steps = [
        { sideEffects: ['network'] },
        { sideEffects: ['storage'] },
        { sideEffects: ['network'] }
      ];
      
      const result = aggregateSideEffects(steps);
      
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('network');
      expect(result[0].steps).toHaveLength(2);
    });
    
    it('should handle empty side effects', () => {
      const steps = [
        { sideEffects: [] },
        { sideEffects: ['network'] }
      ];
      
      const result = aggregateSideEffects(steps);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('network');
    });
  });
});
