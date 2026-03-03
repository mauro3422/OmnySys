/**
 * @fileoverview Storage System - Meta-Factory Test Suite
 * 
 * Agrupa TODOS los módulos de storage:
 * - Utils (hash, etc.)
 * - Setup (directory management)
 * - Files (metadata, analysis, connections, risks, system-map)
 * - Molecules (save/load)
 * - Atoms (save/load)
 * 
 * @module tests/unit/layer-a-analysis/storage/storage-group
 */

import { describe, it, expect } from 'vitest';
import * as storage from '#layer-c/storage/index.js';

describe('Storage System - Completo', () => {
  it('exports all storage functions', () => {
    const expectedFunctions = [
      'calculateFileHash',
      'createDataDirectory',
      'getDataDirectory',
      'hasExistingAnalysis',
      'savePartitionedSystemMap',
      'saveMolecule',
      'loadMolecule',
      'saveAtom',
      'loadAtoms'
    ];

    expectedFunctions.forEach(fnName => {
      expect(typeof storage[fnName]).toBe('function');
    });
  });

  it('has utils functions', () => {
    expect(typeof storage.calculateFileHash).toBe('function');
  });

  it('has setup functions', () => {
    expect(typeof storage.createDataDirectory).toBe('function');
    expect(typeof storage.getDataDirectory).toBe('function');
    expect(typeof storage.hasExistingAnalysis).toBe('function');
  });

  it('has file operations', () => {
    expect(typeof storage.savePartitionedSystemMap).toBe('function');
  });

  it('has molecule operations', () => {
    expect(typeof storage.saveMolecule).toBe('function');
    expect(typeof storage.loadMolecule).toBe('function');
  });

  it('has atom operations', () => {
    expect(typeof storage.saveAtom).toBe('function');
    expect(typeof storage.loadAtoms).toBe('function');
  });
});
