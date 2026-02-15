/**
 * @fileoverview ancestry-extractor.test.js
 * 
 * Tests for Ancestry Extractor
 * Tests extractInheritedConnections, calculateAverageVibration
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/connections/ancestry
 */

import { describe, it, expect, vi } from 'vitest';
import {
  extractInheritedConnections,
  calculateAverageVibration
} from '#layer-a/pipeline/enhancers/connections/ancestry/ancestry-extractor.js';

describe('Ancestry Extractor', () => {
  describe('extractInheritedConnections', () => {
    it('should return empty array for empty atoms', async () => {
      const result = await extractInheritedConnections([]);
      
      expect(result).toEqual([]);
    });

    it('should return empty array for atoms without ancestry', async () => {
      const atoms = [
        { id: 'atom-1', name: 'test' }
      ];

      const result = await extractInheritedConnections(atoms);

      expect(result).toEqual([]);
    });

    it('should extract inherited connections from strongConnections', async () => {
      const atoms = [
        {
          id: 'atom-1',
          ancestry: {
            replaced: 'old-atom-1',
            generation: 2,
            strongConnections: [
              { target: 'atom-2', weight: 0.8 }
            ]
          }
        }
      ];

      const result = await extractInheritedConnections(atoms);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('inherited');
      expect(result[0].from).toBe('atom-1');
      expect(result[0].to).toBe('atom-2');
    });

    it('should extract ruptured connections from warnings', async () => {
      const atoms = [
        {
          id: 'atom-1',
          ancestry: {
            replaced: 'old-atom-1',
            generation: 1,
            warnings: [
              {
                type: 'ruptured_lineage',
                connections: ['atom-2', 'atom-3']
              }
            ]
          }
        }
      ];

      const result = await extractInheritedConnections(atoms);

      expect(result.length).toBe(2);
      expect(result[0].type).toBe('ruptured');
      expect(result[0].status).toBe('broken');
    });

    it('should include confidence in connections', async () => {
      const atoms = [
        {
          id: 'atom-1',
          ancestry: {
            replaced: 'old-atom-1',
            generation: 2,
            strongConnections: [
              { target: 'atom-2', weight: 0.8 }
            ]
          }
        }
      ];

      const result = await extractInheritedConnections(atoms);

      expect(result[0].confidence).toBe(0.7);
    });

    it('should include generation info', async () => {
      const atoms = [
        {
          id: 'atom-1',
          ancestry: {
            replaced: 'old-atom-1',
            generation: 3,
            strongConnections: [
              { target: 'atom-2', weight: 0.8 }
            ]
          }
        }
      ];

      const result = await extractInheritedConnections(atoms);

      expect(result[0].generation).toBe(3);
      expect(result[0].inheritedFrom).toBe('old-atom-1');
    });

    it('should include evidence for inherited connections', async () => {
      const atoms = [
        {
          id: 'atom-1',
          ancestry: {
            replaced: 'old-atom-1',
            generation: 2,
            strongConnections: [
              { target: 'atom-2', weight: 0.8 }
            ]
          }
        }
      ];

      const result = await extractInheritedConnections(atoms);

      expect(result[0].evidence).toHaveProperty('survivalGenerations');
      expect(result[0].evidence.survivalGenerations).toBe(2);
    });

    it('should mark ruptured connections as warning', async () => {
      const atoms = [
        {
          id: 'atom-1',
          ancestry: {
            replaced: 'old-atom-1',
            generation: 1,
            warnings: [
              {
                type: 'ruptured_lineage',
                connections: ['atom-2']
              }
            ]
          }
        }
      ];

      const result = await extractInheritedConnections(atoms);

      expect(result[0].warning).toBe(true);
      expect(result[0].confidence).toBe(0.9);
    });

    it('should handle errors gracefully', async () => {
      const atoms = null;

      const result = await extractInheritedConnections(atoms);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle atoms without ancestry.replaced', async () => {
      const atoms = [
        {
          id: 'atom-1',
          ancestry: {
            strongConnections: []
          }
        }
      ];

      const result = await extractInheritedConnections(atoms);

      expect(result).toEqual([]);
    });
  });

  describe('calculateAverageVibration', () => {
    it('should return 0 for empty array', () => {
      const result = calculateAverageVibration([]);

      expect(result).toBe(0);
    });

    it('should return 0 when no atoms have vibrationScore', () => {
      const atoms = [
        { id: 'atom-1' },
        { id: 'atom-2', ancestry: {} }
      ];

      const result = calculateAverageVibration(atoms);

      expect(result).toBe(0);
    });

    it('should calculate average of vibration scores', () => {
      const atoms = [
        { id: 'atom-1', ancestry: { vibrationScore: 0.5 } },
        { id: 'atom-2', ancestry: { vibrationScore: 0.7 } }
      ];

      const result = calculateAverageVibration(atoms);

      expect(result).toBe(0.6);
    });

    it('should ignore atoms without vibrationScore', () => {
      const atoms = [
        { id: 'atom-1', ancestry: { vibrationScore: 0.5 } },
        { id: 'atom-2' },
        { id: 'atom-3', ancestry: { vibrationScore: 0.9 } }
      ];

      const result = calculateAverageVibration(atoms);

      expect(result).toBe(0.7);
    });

    it('should handle single atom', () => {
      const atoms = [
        { id: 'atom-1', ancestry: { vibrationScore: 0.8 } }
      ];

      const result = calculateAverageVibration(atoms);

      expect(result).toBe(0.8);
    });

    it('should handle fractional results', () => {
      const atoms = [
        { id: 'atom-1', ancestry: { vibrationScore: 0.3 } },
        { id: 'atom-2', ancestry: { vibrationScore: 0.4 } }
      ];

      const result = calculateAverageVibration(atoms);

      expect(result).toBe(0.35);
    });
  });
});
