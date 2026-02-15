/**
 * @fileoverview Unused Exports Detector Tests
 * 
 * Tests for UnusedExportsDetector.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/unused-exports-detector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnusedExportsDetector } from '#layer-a/pattern-detection/detectors/unused-exports-detector.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

// Mock the legacy unused-exports module
vi.mock('#layer-a/analyses/tier1/unused-exports.js', () => ({
  findUnusedExports: vi.fn((systemMap) => {
    // Mock implementation
    const result = { byFile: {} };
    
    if (systemMap.exports) {
      Object.entries(systemMap.exports).forEach(([filePath, exports]) => {
        const unused = exports.filter(exp => {
          // Check if this export is imported anywhere
          for (const [, fileNode] of Object.entries(systemMap.files || {})) {
            for (const imp of fileNode.imports || []) {
              for (const spec of imp.specifiers || []) {
                if ((spec.imported || spec.local) === exp.name) {
                  return false;
                }
              }
            }
          }
          return true;
        });
        
        if (unused.length > 0) {
          result.byFile[filePath] = unused.map(exp => ({
            name: exp.name,
            line: exp.line,
            severity: 'warning'
          }));
        }
      });
    }
    
    return result;
  })
}));

describe('UnusedExportsDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new UnusedExportsDetector({
      config: {},
      globalConfig: { weights: { unusedExports: 0.10 } }
    });
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should have correct ID', () => {
      expect(detector.getId()).toBe('unusedExports');
    });

    it('should have correct name', () => {
      expect(detector.getName()).toBe('Unused Exports');
    });

    it('should have description', () => {
      expect(detector.getDescription()).toContain('exports');
    });

    it('should be instantiable', () => {
      expect(detector).toBeInstanceOf(UnusedExportsDetector);
    });

    it('should have detect method', () => {
      expect(typeof detector.detect).toBe('function');
    });
  });

  /**
   * ============================================
   * DETECTION CONTRACT
   * ============================================
   */

  describe('Detection Contract', () => {
    it('should return valid detection result structure', async () => {
      const systemMap = PatternDetectionTestFactory.createMinimalSystemMap();
      const result = await detector.detect(systemMap);

      expect(result).toHaveProperty('detector', 'unusedExports');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('weight');
      expect(result).toHaveProperty('recommendation');
    });

    it('should detect unused exports', async () => {
      const systemMap = PatternDetectionTestFactory.createUnusedExportsSystemMap();
      const result = await detector.detect(systemMap);

      // Should find unused exports
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('should not flag used exports', async () => {
      const systemMap = {
        exports: {
          'src/utils.js': [
            { name: 'usedHelper', line: 1 }
          ]
        },
        files: {
          'src/app.js': {
            imports: [
              { source: './utils', specifiers: [{ imported: 'usedHelper' }], line: 1 }
            ]
          }
        }
      };

      const result = await detector.detect(systemMap);
      const usedFinding = result.findings.find(f => f.metadata?.exportName === 'usedHelper');
      expect(usedFinding).toBeUndefined();
    });
  });

  /**
   * ============================================
   * FINDING STRUCTURE CONTRACT
   * ============================================
   */

  describe('Finding Structure Contract', () => {
    it('should create findings with correct structure', async () => {
      const systemMap = PatternDetectionTestFactory.createUnusedExportsSystemMap();
      const result = await detector.detect(systemMap);

      if (result.findings.length > 0) {
        const finding = result.findings[0];
        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('type', 'unused_export');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('file');
        expect(finding).toHaveProperty('line');
        expect(finding).toHaveProperty('message');
        expect(finding).toHaveProperty('recommendation');
        expect(finding).toHaveProperty('metadata');
      }
    });

    it('should include export name in metadata', async () => {
      const systemMap = PatternDetectionTestFactory.createUnusedExportsSystemMap();
      const result = await detector.detect(systemMap);

      if (result.findings.length > 0) {
        expect(result.findings[0].metadata).toHaveProperty('exportName');
      }
    });

    it('should assign medium severity for warnings', async () => {
      const systemMap = {
        exports: {
          'src/utils.js': [
            { name: 'unusedFunc', line: 1 }
          ]
        },
        files: {}
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].severity).toBe('medium');
      }
    });
  });

  /**
   * ============================================
   * BARREL FILE HANDLING CONTRACT
   * ============================================
   */

  describe('Barrel File Handling Contract', () => {
    it('should skip barrel files with many exports', async () => {
      const systemMap = {
        exports: {
          'src/index.js': Array(10).fill(null).map((_, i) => ({
            name: `export${i}`,
            line: i + 1
          }))
        },
        files: {}
      };

      const result = await detector.detect(systemMap);
      // Barrel files (index.js with > 5 exports) should be skipped
      expect(result.findings.length).toBe(0);
    });

    it('should not skip non-barrel index files', async () => {
      const systemMap = {
        exports: {
          'src/index.js': [
            { name: 'main', line: 1 },
            { name: 'helper', line: 2 }
          ]
        },
        files: {}
      };

      const result = await detector.detect(systemMap);
      // Non-barrel index files (<= 5 exports) should be checked
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  /**
   * ============================================
   * SCORE CALCULATION CONTRACT
   * ============================================
   */

  describe('Score Calculation Contract', () => {
    it('should return 100 for no findings', async () => {
      const systemMap = {
        exports: {},
        files: {}
      };

      const result = await detector.detect(systemMap);
      expect(result.score).toBe(100);
    });

    it('should reduce score based on findings count', async () => {
      const systemMap = {
        exports: {
          'src/utils.js': Array(10).fill(null).map((_, i) => ({
            name: `unused${i}`,
            line: i + 1
          }))
        },
        files: {}
      };

      const result = await detector.detect(systemMap);
      expect(result.score).toBeLessThan(100);
    });

    it('should use inherited calculateScore method', async () => {
      const systemMap = PatternDetectionTestFactory.createUnusedExportsSystemMap();
      const result = await detector.detect(systemMap);
      
      // Score should be calculated based on findings
      if (result.findings.length > 0) {
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.score).toBeGreaterThanOrEqual(0);
      }
    });
  });

  /**
   * ============================================
   * RECOMMENDATION CONTRACT
   * ============================================
   */

  describe('Recommendation Contract', () => {
    it('should provide recommendation when findings exist', async () => {
      const systemMap = PatternDetectionTestFactory.createUnusedExportsSystemMap();
      const result = await detector.detect(systemMap);

      if (result.findings.length > 0) {
        expect(result.recommendation).toContain('Found');
        expect(result.recommendation).toContain(result.findings.length.toString());
      }
    });

    it('should provide positive recommendation when no findings', async () => {
      const systemMap = {
        exports: {},
        files: {}
      };

      const result = await detector.detect(systemMap);
      expect(result.recommendation).toContain('No unused exports');
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle null systemMap', async () => {
      const result = await detector.detect(null);
      expect(result.findings).toEqual([]);
    });

    it('should handle undefined exports', async () => {
      const systemMap = {
        files: {}
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toEqual([]);
    });

    it('should handle null exports entry', async () => {
      const systemMap = {
        exports: {
          'src/utils.js': null
        },
        files: {}
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toBeDefined();
    });

    it('should handle exports without name', async () => {
      const systemMap = {
        exports: {
          'src/utils.js': [
            { line: 1 }, // no name
            { name: 'validExport', line: 2 }
          ]
        },
        files: {}
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toBeDefined();
    });

    it('should handle malformed imports', async () => {
      const systemMap = {
        exports: {
          'src/utils.js': [{ name: 'test', line: 1 }]
        },
        files: {
          'src/app.js': {
            imports: [
              null,
              undefined,
              { source: './utils' }, // no specifiers
              { specifiers: null }
            ]
          }
        }
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toBeDefined();
    });
  });
});
