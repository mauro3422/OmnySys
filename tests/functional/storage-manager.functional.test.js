/**
 * @fileoverview Storage Manager - Tests Funcionales Simplificados
 * 
 * Tests funcionales para storage/storage-manager/index.js
 * 
 * @module tests/functional/storage-manager.functional.test
 */

import { describe, it, expect } from 'vitest';
import * as storageManager from '#layer-c/storage/index.js';

describe('Storage Manager - Functional Tests', () => {
  
  it('all expected functions are exported', () => {
    expect(typeof storageManager.saveMetadata).toBe('function');
    expect(typeof storageManager.saveFileAnalysis).toBe('function');
    expect(typeof storageManager.saveConnections).toBe('function');
    expect(typeof storageManager.saveRiskAssessment).toBe('function');
    expect(typeof storageManager.saveMolecule).toBe('function');
    expect(typeof storageManager.loadMolecule).toBe('function');
    expect(typeof storageManager.saveAtom).toBe('function');
    expect(typeof storageManager.loadAtoms).toBe('function');
    expect(typeof storageManager.createDataDirectory).toBe('function');
    expect(typeof storageManager.getDataDirectory).toBe('function');
    expect(typeof storageManager.hasExistingAnalysis).toBe('function');
    expect(typeof storageManager.calculateFileHash).toBe('function');
  });

  describe('Utility Functions', () => {
    it('calculateFileHash generates consistent hash', () => {
      const content = 'const x = 1;';
      
      const hash = storageManager.calculateFileHash(content);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('calculateFileHash returns same hash for same content', () => {
      const content = 'test content';
      
      const hash1 = storageManager.calculateFileHash(content);
      const hash2 = storageManager.calculateFileHash(content);
      
      expect(hash1).toBe(hash2);
    });

    it('calculateFileHash handles empty string', () => {
      const hash = storageManager.calculateFileHash('');
      
      expect(typeof hash).toBe('string');
    });
  });

  describe('Directory Operations', () => {
    it('createDataDirectory is exported', () => {
      expect(typeof storageManager.createDataDirectory).toBe('function');
    });

    it('getDataDirectory is exported', () => {
      expect(typeof storageManager.getDataDirectory).toBe('function');
    });

    it('hasExistingAnalysis is exported', () => {
      expect(typeof storageManager.hasExistingAnalysis).toBe('function');
    });
  });

  describe('Save Operations', () => {
    it('saveMetadata is exported', () => {
      expect(typeof storageManager.saveMetadata).toBe('function');
    });

    it('saveFileAnalysis is exported', () => {
      expect(typeof storageManager.saveFileAnalysis).toBe('function');
    });

    it('saveConnections is exported', () => {
      expect(typeof storageManager.saveConnections).toBe('function');
    });

    it('saveRiskAssessment is exported', () => {
      expect(typeof storageManager.saveRiskAssessment).toBe('function');
    });
  });

  describe('Molecule Operations', () => {
    it('saveMolecule is exported', () => {
      expect(typeof storageManager.saveMolecule).toBe('function');
    });

    it('loadMolecule is exported', () => {
      expect(typeof storageManager.loadMolecule).toBe('function');
    });
  });

  describe('Atom Operations', () => {
    it('saveAtom is exported', () => {
      expect(typeof storageManager.saveAtom).toBe('function');
    });

    it('loadAtoms is exported', () => {
      expect(typeof storageManager.loadAtoms).toBe('function');
    });
  });
});
