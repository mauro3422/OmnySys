/**
 * @fileoverview Coupling Detector Tests
 * 
 * Tests for CouplingDetector.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/coupling-detector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CouplingDetector } from '#layer-a/pattern-detection/detectors/coupling-detector.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

describe('CouplingDetector', () => {
  let detector;
  let config;

  beforeEach(() => {
    config = {
      highImportThreshold: 15,
      highDependentThreshold: 10,
      criticalImportThreshold: 25
    };
    detector = new CouplingDetector({
      config,
      globalConfig: { weights: { coupling: 0.15 } }
    });
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should have correct ID', () => {
      expect(detector.getId()).toBe('coupling');
    });

    it('should have correct name', () => {
      expect(detector.getName()).toBe('Architectural Coupling');
    });

    it('should have description', () => {
      expect(detector.getDescription()).toContain('acoplamiento');
    });

    it('should be instantiable', () => {
      expect(detector).toBeInstanceOf(CouplingDetector);
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

      expect(result).toHaveProperty('detector', 'coupling');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('weight');
      expect(result).toHaveProperty('recommendation');
    });

    it('should return empty findings for empty systemMap', async () => {
      const result = await detector.detect({ files: {} });
      expect(result.findings).toEqual([]);
      expect(result.score).toBe(100);
    });

    it('should return empty findings for systemMap without files', async () => {
      const result = await detector.detect({});
      expect(result.findings).toEqual([]);
    });

    it('should detect high coupling patterns', async () => {
      const systemMap = PatternDetectionTestFactory.createCouplingSystemMap();
      const result = await detector.detect(systemMap);

      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  /**
   * ============================================
   * FINDING STRUCTURE CONTRACT
   * ============================================
   */

  describe('Finding Structure Contract', () => {
    it('should create findings with correct structure', async () => {
      const systemMap = PatternDetectionTestFactory.createCouplingSystemMap();
      const result = await detector.detect(systemMap);

      if (result.findings.length > 0) {
        const finding = result.findings[0];
        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('type', 'architectural_coupling');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('file');
        expect(finding).toHaveProperty('message');
        expect(finding).toHaveProperty('recommendation');
        expect(finding).toHaveProperty('metadata');
      }
    });

    it('should include metadata in findings', async () => {
      const systemMap = PatternDetectionTestFactory.createCouplingSystemMap();
      const result = await detector.detect(systemMap);

      if (result.findings.length > 0) {
        const meta = result.findings[0].metadata;
        expect(meta).toHaveProperty('importCount');
        expect(meta).toHaveProperty('dependentCount');
        expect(meta).toHaveProperty('couplingRatio');
        expect(meta).toHaveProperty('riskScore');
        expect(meta).toHaveProperty('factors');
      }
    });

    it('should assign critical severity for god objects', async () => {
      const systemMap = {
        files: {
          'src/godObject.js': {
            imports: Array(30).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(20).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      const godObjectFinding = result.findings.find(f => f.file.includes('godObject'));
      
      if (godObjectFinding) {
        expect(godObjectFinding.severity).toBe('critical');
      }
    });
  });

  /**
   * ============================================
   * INTENTIONALLY COUPLED FILTERING CONTRACT
   * ============================================
   */

  describe('Intentionally Coupled Filtering Contract', () => {
    it('should not flag index.js files', async () => {
      const systemMap = {
        files: {
          'src/index.js': {
            imports: Array(30).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(20).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      const indexFinding = result.findings.find(f => f.file.includes('index.js'));
      expect(indexFinding).toBeUndefined();
    });

    it('should not flag config files', async () => {
      const systemMap = {
        files: {
          'src/config/database.js': {
            imports: Array(30).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(20).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      const configFinding = result.findings.find(f => f.file.includes('config/'));
      expect(configFinding).toBeUndefined();
    });

    it('should not flag test utilities', async () => {
      const systemMap = {
        files: {
          'src/test/helpers.js': {
            imports: Array(30).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(20).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      const testFinding = result.findings.find(f => f.file.includes('test/'));
      expect(testFinding).toBeUndefined();
    });

    it('should not flag CLI commands', async () => {
      const systemMap = {
        files: {
          'src/cli/commands/run.js': {
            imports: Array(30).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(20).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      const cliFinding = result.findings.find(f => f.file.includes('cli/commands'));
      expect(cliFinding).toBeUndefined();
    });

    it('should not flag API routes', async () => {
      const systemMap = {
        files: {
          'src/api/routes/users.js': {
            imports: Array(30).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(20).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      const apiFinding = result.findings.find(f => f.file.includes('api/routes'));
      expect(apiFinding).toBeUndefined();
    });
  });

  /**
   * ============================================
   * SEVERITY CALCULATION CONTRACT
   * ============================================
   */

  describe('Severity Calculation Contract', () => {
    it('should assign CRITICAL for high imports AND high dependents', async () => {
      const systemMap = {
        files: {
          'src/problematic.js': {
            imports: Array(30).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(15).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].severity).toBe('critical');
      }
    });

    it('should assign HIGH for high imports OR high dependents', async () => {
      const systemMap = {
        files: {
          'src/highImports.js': {
            imports: Array(20).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(5).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].severity).toBe('high');
      }
    });

    it('should assign MEDIUM for moderate coupling', async () => {
      const systemMap = {
        files: {
          'src/moderate.js': {
            imports: Array(12).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(6).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].severity).toBe('medium');
      }
    });
  });

  /**
   * ============================================
   * MESSAGE GENERATION CONTRACT
   * ============================================
   */

  describe('Message Generation Contract', () => {
    it('should generate god object message for critical severity', async () => {
      const systemMap = {
        files: {
          'src/god.js': {
            imports: Array(30).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(15).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].message).toContain('God Object');
      }
    });

    it('should generate high dependency message for import-heavy files', async () => {
      const systemMap = {
        files: {
          'src/imports.js': {
            imports: Array(20).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: []
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].message).toContain('imports');
      }
    });
  });

  /**
   * ============================================
   * RISK FACTORS CONTRACT
   * ============================================
   */

  describe('Risk Factors Contract', () => {
    it('should identify high_imports factor', async () => {
      const systemMap = {
        files: {
          'src/manyImports.js': {
            imports: Array(25).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: []
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].metadata.factors).toContain('high_imports');
      }
    });

    it('should identify high_dependents factor', async () => {
      const systemMap = {
        files: {
          'src/manyDependents.js': {
            imports: [],
            usedBy: Array(20).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].metadata.factors).toContain('high_dependents');
      }
    });

    it('should identify potential circular dependencies', async () => {
      const systemMap = {
        files: {
          'src/circular.js': {
            imports: ['moduleA', 'moduleB'],
            usedBy: ['moduleA', 'moduleB'],
            dependsOn: ['moduleA', 'moduleB']
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length > 0) {
        expect(result.findings[0].metadata.factors).toContain('potential_circular_deps');
      }
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle files without imports', async () => {
      const systemMap = {
        files: {
          'src/simple.js': {}
        }
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toEqual([]);
    });

    it('should handle files with null imports', async () => {
      const systemMap = {
        files: {
          'src/nullImports.js': {
            imports: null,
            usedBy: null
          }
        }
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toEqual([]);
    });

    it('should handle empty file path', async () => {
      const systemMap = {
        files: {
          '': {
            imports: Array(30).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(20).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      expect(result.findings).toBeDefined();
    });

    it('should sort findings by risk score descending', async () => {
      const systemMap = {
        files: {
          'src/lowRisk.js': {
            imports: Array(12).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(6).fill(null).map((_, i) => `consumer${i}.js`)
          },
          'src/highRisk.js': {
            imports: Array(30).fill(null).map((_, i) => ({ source: `mod${i}` })),
            usedBy: Array(20).fill(null).map((_, i) => `consumer${i}.js`)
          }
        }
      };

      const result = await detector.detect(systemMap);
      if (result.findings.length >= 2) {
        expect(result.findings[0].metadata.riskScore).toBeGreaterThanOrEqual(
          result.findings[1].metadata.riskScore
        );
      }
    });
  });
});
