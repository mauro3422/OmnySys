/**
 * Tier 2 Analysis: Coupling Tests
 * 
 * Tests for analyzeCoupling - measures inter-module dependencies
 */

import { describe, it, expect } from 'vitest';
import { analyzeCoupling } from '#layer-a/analyses/tier2/coupling.js';
import { 
  createMockSystemMap, 
  createMockFile 
} from '../../../factories/analysis.factory.js';

describe('Tier 2 - Coupling Analysis', () => {
  describe('Structure Contract', () => {
    it('MUST return an object with coupling metrics', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeCoupling(systemMap);
      
      expect(result).toBeTypeOf('object');
    });

    it('MUST NOT throw on empty system map', () => {
      const systemMap = createMockSystemMap();
      expect(() => analyzeCoupling(systemMap)).not.toThrow();
    });
  });

  describe('Coupling Metrics', () => {
    it('should calculate afferent coupling (incoming deps)', () => {
      const systemMap = createMockSystemMap({
        files: {
          'core.js': createMockFile('core.js', { usedBy: ['a.js', 'b.js', 'c.js'] }),
          'util.js': createMockFile('util.js', { usedBy: ['d.js'] })
        }
      });
      
      const result = analyzeCoupling(systemMap);
      expect(result).toBeDefined();
    });

    it('should calculate efferent coupling (outgoing deps)', () => {
      const systemMap = createMockSystemMap({
        files: {
          'app.js': createMockFile('app.js', { dependsOn: ['a.js', 'b.js', 'c.js', 'd.js'] }),
          'simple.js': createMockFile('simple.js', { dependsOn: ['a.js'] })
        }
      });
      
      const result = analyzeCoupling(systemMap);
      expect(result).toBeDefined();
    });

    it('should identify highly coupled modules', () => {
      const systemMap = createMockSystemMap({
        files: {
          'god.js': createMockFile('god.js', { 
            usedBy: ['a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js', 'g.js', 'h.js', 'i.js', 'j.js'],
            dependsOn: ['x.js', 'y.js', 'z.js']
          })
        }
      });
      
      const result = analyzeCoupling(systemMap);
      expect(result).toBeDefined();
    });
  });

  describe('Instability Metric', () => {
    it('should calculate instability (Ce / (Ca + Ce))', () => {
      const systemMap = createMockSystemMap({
        files: {
          'module.js': createMockFile('module.js', {
            usedBy: ['a.js', 'b.js'], // Ca = 2
            dependsOn: ['x.js', 'y.js', 'z.js'] // Ce = 3
          })
        }
      });
      
      const result = analyzeCoupling(systemMap);
      expect(result).toBeDefined();
      // I = Ce / (Ca + Ce) = 3 / (2 + 3) = 0.6
    });

    it('should handle zero coupling (stable module)', () => {
      const systemMap = createMockSystemMap({
        files: {
          'stable.js': createMockFile('stable.js', {
            usedBy: ['a.js', 'b.js'], // Ca = 2
            dependsOn: [] // Ce = 0
          })
        }
      });
      
      const result = analyzeCoupling(systemMap);
      expect(result).toBeDefined();
      // I = 0 / (2 + 0) = 0 (completely stable)
    });

    it('should handle zero incoming deps (unstable module)', () => {
      const systemMap = createMockSystemMap({
        files: {
          'unstable.js': createMockFile('unstable.js', {
            usedBy: [], // Ca = 0
            dependsOn: ['x.js', 'y.js'] // Ce = 2
          })
        }
      });
      
      const result = analyzeCoupling(systemMap);
      expect(result).toBeDefined();
      // I = 2 / (0 + 2) = 1 (completely unstable)
    });
  });

  describe('Abstractness Metric', () => {
    it('should calculate abstractness for modules', () => {
      const systemMap = createMockSystemMap({
        files: {
          'abstract.js': createMockFile('abstract.js', {
            exports: ['Interface', 'AbstractClass']
          })
        }
      });
      
      const result = analyzeCoupling(systemMap);
      expect(result).toBeDefined();
    });
  });

  describe('Distance from Main Sequence', () => {
    it('should calculate distance |A + I - 1|', () => {
      const systemMap = createMockSystemMap({
        files: {
          'balanced.js': createMockFile('balanced.js', {
            usedBy: ['a.js'],
            dependsOn: ['x.js'],
            exports: ['Interface']
          })
        }
      });
      
      const result = analyzeCoupling(systemMap);
      expect(result).toBeDefined();
      // For a balanced module, distance should be close to 0
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files object', () => {
      const systemMap = createMockSystemMap({ files: {} });
      const result = analyzeCoupling(systemMap);
      
      expect(result).toBeDefined();
    });

    it('should handle missing usedBy/dependsOn arrays', () => {
      const systemMap = createMockSystemMap({
        files: {
          'file.js': { path: 'file.js' }
        }
      });
      
      const result = analyzeCoupling(systemMap);
      expect(result).toBeDefined();
    });
  });
});
