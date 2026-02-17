/**
 * @fileoverview cohesion-calculator.test.js
 *
 * Tests para cálculo de cohesión
 *
 * @module tests/unit/layer-b-semantic/project-analyzer/utils/cohesion-calculator
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCohesion,
  calculateInternalCohesion
} from '#layer-b/project-analyzer/utils/cohesion-calculator.js';

describe('project-analyzer/utils/cohesion-calculator', () => {
  describe('calculateCohesion', () => {
    it('should return 0 for unrelated files', () => {
      const fileA = { imports: [], usedBy: [] };
      const fileB = { imports: [], usedBy: [] };

      const result = calculateCohesion(
        fileA, fileB,
        'src/components/A.js',
        'src/utils/B.js'
      );

      expect(result).toBe(0);
    });

    it('should detect direct import A -> B', () => {
      const fileA = {
        imports: [{ resolvedPath: 'src/utils/B.js' }],
        usedBy: []
      };
      const fileB = { imports: [], usedBy: [] };

      const result = calculateCohesion(
        fileA, fileB,
        'src/components/A.js',
        'src/utils/B.js'
      );

      expect(result).toBeGreaterThan(0);
    });

    it('should detect direct import B -> A', () => {
      const fileA = { imports: [], usedBy: [] };
      const fileB = {
        imports: [{ resolvedPath: 'src/components/A.js' }],
        usedBy: []
      };

      const result = calculateCohesion(
        fileA, fileB,
        'src/components/A.js',
        'src/utils/B.js'
      );

      expect(result).toBeGreaterThan(0);
    });

    it('should detect bidirectional imports', () => {
      const fileA = {
        imports: [{ resolvedPath: 'src/utils/B.js' }],
        usedBy: []
      };
      const fileB = {
        imports: [{ resolvedPath: 'src/components/A.js' }],
        usedBy: []
      };

      const result = calculateCohesion(
        fileA, fileB,
        'src/components/A.js',
        'src/utils/B.js'
      );

      // Should be sum of both directions
      expect(result).toBeGreaterThan(3); // Each import is 3
    });

    it('should detect same directory cohesion', () => {
      const fileA = { imports: [], usedBy: [] };
      const fileB = { imports: [], usedBy: [] };

      const result = calculateCohesion(
        fileA, fileB,
        'src/components/A.js',
        'src/components/B.js'
      );

      expect(result).toBeGreaterThanOrEqual(1); // Same directory weight is 1
    });

    it('should detect shared state write/read', () => {
      const fileA = {
        semanticAnalysis: {
          sharedState: { writes: ['userConfig'] }
        }
      };
      const fileB = {
        semanticAnalysis: {
          sharedState: { reads: ['userConfig'] }
        }
      };

      const result = calculateCohesion(
        fileA, fileB,
        'src/a.js',
        'src/b.js'
      );

      expect(result).toBeGreaterThanOrEqual(2); // Shared state weight is 2
    });

    it('should detect event emitter/listener', () => {
      const fileA = {
        semanticAnalysis: {
          eventPatterns: { eventEmitters: ['user:login'] }
        }
      };
      const fileB = {
        semanticAnalysis: {
          eventPatterns: { eventListeners: ['user:login'] }
        }
      };

      const result = calculateCohesion(
        fileA, fileB,
        'src/a.js',
        'src/b.js'
      );

      expect(result).toBeGreaterThanOrEqual(2); // Shared events weight is 2
    });

    it('should combine multiple cohesion factors', () => {
      const fileA = {
        imports: [{ resolvedPath: 'src/components/B.js' }],
        semanticAnalysis: {
          eventPatterns: { eventEmitters: ['event1'] }
        }
      };
      const fileB = {
        semanticAnalysis: {
          eventPatterns: { eventListeners: ['event1'] }
        }
      };

      const result = calculateCohesion(
        fileA, fileB,
        'src/components/A.js',
        'src/components/B.js'
      );

      // Import (3) + Same dir (1) + Events (2) = 6
      expect(result).toBeGreaterThanOrEqual(5);
    });

    it('should handle missing semanticAnalysis', () => {
      const fileA = { imports: [] };
      const fileB = { imports: [] };

      const result = calculateCohesion(
        fileA, fileB,
        'src/a.js',
        'src/b.js'
      );

      expect(typeof result).toBe('number');
    });
  });

  describe('calculateInternalCohesion', () => {
    it('should return 0 for empty cluster', () => {
      const cluster = new Set();
      const matrix = new Map();

      const result = calculateInternalCohesion(cluster, matrix);

      expect(result).toBe(0);
    });

    it('should return 0 for single file cluster', () => {
      const cluster = new Set(['file1.js']);
      const matrix = new Map();

      const result = calculateInternalCohesion(cluster, matrix);

      expect(result).toBe(0);
    });

    it('should calculate average cohesion for cluster', () => {
      const cluster = new Set(['a.js', 'b.js', 'c.js']);
      const matrix = new Map([
        ['a.js', new Map([['b.js', 5], ['c.js', 3]])],
        ['b.js', new Map([['a.js', 5], ['c.js', 4]])],
        ['c.js', new Map([['a.js', 3], ['b.js', 4]])]
      ]);

      const result = calculateInternalCohesion(cluster, matrix);

      // (5 + 3 + 5 + 4 + 3 + 4) / 6 = 24 / 6 = 4
      expect(result).toBe(4);
    });

    it('should handle missing connections', () => {
      const cluster = new Set(['a.js', 'b.js']);
      const matrix = new Map([
        ['a.js', new Map()]
      ]);

      const result = calculateInternalCohesion(cluster, matrix);

      // Only one direction missing, treated as 0
      expect(result).toBe(0);
    });
  });
});
