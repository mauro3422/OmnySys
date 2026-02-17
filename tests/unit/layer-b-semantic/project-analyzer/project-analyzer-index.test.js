/**
 * @fileoverview project-analyzer-index.test.js
 * 
 * Tests para el facade principal del project-analyzer
 * 
 * @module tests/unit/layer-b-semantic/project-analyzer/index
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeProjectStructure,
  generateStructureReport,
  calculateCohesion,
  calculateInternalCohesion,
  detectClusters,
  identifyOrphans,
  COHESION_WEIGHTS,
  Severity
} from '#layer-b/project-analyzer/index.js';

describe('project-analyzer/index', () => {
  describe('exports', () => {
    it('should export analyzeProjectStructure', () => {
      expect(typeof analyzeProjectStructure).toBe('function');
    });

    it('should export generateStructureReport', () => {
      expect(typeof generateStructureReport).toBe('function');
    });

    it('should export utility functions', () => {
      expect(typeof calculateCohesion).toBe('function');
      expect(typeof calculateInternalCohesion).toBe('function');
      expect(typeof detectClusters).toBe('function');
      expect(typeof identifyOrphans).toBe('function');
    });

    it('should export constants', () => {
      expect(COHESION_WEIGHTS).toBeDefined();
      expect(Severity).toBeDefined();
    });
  });

  describe('analyzeProjectStructure', () => {
    it('should return structure with empty results', () => {
      const staticResults = { files: {} };
      
      const result = analyzeProjectStructure(staticResults);
      
      expect(result).toHaveProperty('subsystems');
      expect(result).toHaveProperty('orphans');
      expect(result).toHaveProperty('stats');
    });

    it('should detect subsystems from connected files', () => {
      const staticResults = {
        files: {
          'src/a.js': { imports: [], usedBy: ['src/b.js'] },
          'src/b.js': { imports: ['src/a.js'], usedBy: [] }
        }
      };
      
      const result = analyzeProjectStructure(staticResults);
      
      expect(Array.isArray(result.subsystems)).toBe(true);
      expect(Array.isArray(result.orphans)).toBe(true);
    });

    it('should include stats in result', () => {
      const staticResults = {
        files: {
          'src/a.js': { imports: [], usedBy: [] },
          'src/b.js': { imports: [], usedBy: [] }
        }
      };
      
      const result = analyzeProjectStructure(staticResults);
      
      expect(result.stats).toHaveProperty('totalFiles');
      expect(result.stats.totalFiles).toBe(2);
    });

    it('should handle files with semantic analysis', () => {
      const staticResults = {
        files: {
          'src/a.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {
              sharedState: { writes: ['state1'] }
            }
          },
          'src/b.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {
              sharedState: { reads: ['state1'] }
            }
          }
        }
      };
      
      const result = analyzeProjectStructure(staticResults);
      
      expect(result).toHaveProperty('subsystems');
      expect(result).toHaveProperty('orphans');
    });
  });
});
