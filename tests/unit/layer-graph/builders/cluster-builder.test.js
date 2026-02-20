/**
 * @fileoverview cluster-builder.test.js
 * 
 * Tests para el Cluster Builder
 */

import { describe, it, expect } from 'vitest';
import { buildFileClusters, buildPurposeClusters, getClusterStats } from '../../../../src/layer-graph/builders/cluster-builder.js';

describe('Cluster Builder', () => {
  describe('buildFileClusters', () => {
    it('should return empty array for empty atoms', () => {
      const atoms = new Map();
      const result = buildFileClusters(atoms);
      
      expect(result).toEqual([]);
    });
    
    it('should group atoms by file', () => {
      const atoms = new Map([
        ['atom1', { id: 'atom1', name: 'fn1', filePath: 'src/file1.js', purpose: 'API_EXPORT' }],
        ['atom2', { id: 'atom2', name: 'fn2', filePath: 'src/file1.js', purpose: 'API_EXPORT' }],
        ['atom3', { id: 'atom3', name: 'fn3', filePath: 'src/file1.js', purpose: 'CLASS_METHOD' }],
        ['atom4', { id: 'atom4', name: 'fn4', filePath: 'src/file1.js', purpose: 'CLASS_METHOD' }],
        ['atom5', { id: 'atom5', name: 'fn5', filePath: 'src/file1.js', purpose: 'CLASS_METHOD' }]
      ]);
      
      const result = buildFileClusters(atoms);
      
      expect(result.length).toBe(1);
      expect(result[0].atoms.length).toBe(5);
      expect(result[0].file).toBe('src/file1.js');
    });
    
    it('should filter files with less than 3 atoms', () => {
      const atoms = new Map([
        ['atom1', { id: 'atom1', name: 'fn1', filePath: 'src/small.js', purpose: 'API_EXPORT' }],
        ['atom2', { id: 'atom2', name: 'fn2', filePath: 'src/small.js', purpose: 'API_EXPORT' }]
      ]);
      
      const result = buildFileClusters(atoms);
      
      expect(result).toEqual([]);
    });
    
    it('should calculate cohesion', () => {
      const atoms = new Map([
        ['atom1', { 
          id: 'atom1', 
          name: 'fn1', 
          filePath: 'src/file.js', 
          purpose: 'API_EXPORT',
          calls: [{ name: 'fn2' }, { name: 'fn3' }]
        }],
        ['atom2', { 
          id: 'atom2', 
          name: 'fn2', 
          filePath: 'src/file.js', 
          purpose: 'API_EXPORT',
          calls: [{ name: 'fn3' }]
        }],
        ['atom3', { 
          id: 'atom3', 
          name: 'fn3', 
          filePath: 'src/file.js', 
          purpose: 'CLASS_METHOD',
          calls: []
        }]
      ]);
      
      const result = buildFileClusters(atoms);
      
      expect(result[0].cohesion).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('buildPurposeClusters', () => {
    it('should group atoms by purpose and archetype', () => {
      const atoms = new Map([
        ['atom1', { id: 'atom1', name: 'fn1', filePath: 'src/a.js', purpose: 'API_EXPORT', archetype: { type: 'utility' } }],
        ['atom2', { id: 'atom2', name: 'fn2', filePath: 'src/b.js', purpose: 'API_EXPORT', archetype: { type: 'utility' } }],
        ['atom3', { id: 'atom3', name: 'fn3', filePath: 'src/c.js', purpose: 'API_EXPORT', archetype: { type: 'utility' } }],
        ['atom4', { id: 'atom4', name: 'fn4', filePath: 'src/d.js', purpose: 'API_EXPORT', archetype: { type: 'utility' } }],
        ['atom5', { id: 'atom5', name: 'fn5', filePath: 'src/e.js', purpose: 'API_EXPORT', archetype: { type: 'utility' } }]
      ]);
      
      const result = buildPurposeClusters(atoms);
      
      expect(result.length).toBe(1);
      expect(result[0].atoms.length).toBe(5);
    });
    
    it('should filter clusters with less than 5 atoms', () => {
      const atoms = new Map([
        ['atom1', { id: 'atom1', name: 'fn1', filePath: 'src/a.js', purpose: 'API_EXPORT', archetype: { type: 'utility' } }],
        ['atom2', { id: 'atom2', name: 'fn2', filePath: 'src/b.js', purpose: 'API_EXPORT', archetype: { type: 'utility' } }]
      ]);
      
      const result = buildPurposeClusters(atoms);
      
      expect(result).toEqual([]);
    });
  });
  
  describe('getClusterStats', () => {
    it('should return stats for clusters', () => {
      const clusters = [
        { atoms: [1, 2, 3], cohesion: 0.5, purposes: ['API_EXPORT'] },
        { atoms: [4, 5], cohesion: 0.8, purposes: ['TEST_HELPER'] },
        { atoms: [6], cohesion: 0.3, purposes: ['API_EXPORT'] }
      ];
      
      const stats = getClusterStats(clusters);
      
      expect(stats.totalClusters).toBe(3);
      expect(stats.totalAtoms).toBe(6);
      expect(stats.avgClusterSize).toBe(2);
      expect(stats.avgCohesion).toBeCloseTo(0.533, 2);
    });
    
    it('should handle empty clusters', () => {
      const stats = getClusterStats([]);
      
      expect(stats.totalClusters).toBe(0);
      expect(stats.totalAtoms).toBe(0);
      expect(stats.avgClusterSize).toBe(0);
      expect(stats.avgCohesion).toBe(0);
    });
  });
});