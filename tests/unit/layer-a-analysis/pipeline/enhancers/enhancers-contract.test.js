/**
 * @fileoverview enhancers-contract.test.js
 * 
 * Contract tests for Pipeline Enhancers module
 * Ensures all exports are present and follow the expected interface
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/enhancers-contract
 */

import { describe, it, expect } from 'vitest';

// Test main index.js exports
import {
  // Orchestrators
  runEnhancers,
  runProjectEnhancers,
  // Builders
  buildSourceCodeMap,
  readSourceFile,
  getRelativePath,
  // Analyzers
  collectSemanticIssues,
  detectHighCoupling,
  detectCriticalRisk,
  // Legacy
  enhanceSystemMap,
  enrichSystemMap,
  // Individual enhancers
  enrichConnections,
  enhanceMetadata
} from '#layer-a/pipeline/enhancers/index.js';

// Test connection-enricher exports
import { enrichConnections as enrichConnectionsDirect } from '#layer-a/pipeline/enhancers/connection-enricher.js';

// Test metadata-enhancer exports
import { enhanceMetadata as enhanceMetadataDirect } from '#layer-a/pipeline/enhancers/metadata-enhancer.js';

// Test ancestry exports
import {
  extractInheritedConnections,
  calculateAverageVibration
} from '#layer-a/pipeline/enhancers/connections/ancestry/index.js';

// Test conflicts exports
import {
  detectConnectionConflicts,
  hasCriticalConflicts,
  groupConflictsBySeverity
} from '#layer-a/pipeline/enhancers/connections/conflicts/index.js';

// Test dataflow exports
import {
  extractDataFlowConnections,
  generateTypeKey,
  calculateDataFlowConfidence
} from '#layer-a/pipeline/enhancers/connections/dataflow/index.js';

// Test weights exports
import {
  calculateAllWeights,
  calculateConnectionWeight,
  getConnectionCategory,
  getWeightStats
} from '#layer-a/pipeline/enhancers/connections/weights/index.js';

// Test orchestrators index
import {
  runEnhancers as runEnhancersDirect,
  runProjectEnhancers as runProjectEnhancersDirect
} from '#layer-a/pipeline/enhancers/orchestrators/index.js';

// Test legacy index
import {
  enhanceSystemMap as enhanceSystemMapDirect,
  enrichSystemMap as enrichSystemMapDirect
} from '#layer-a/pipeline/enhancers/legacy/index.js';

describe('Enhancers Contract Tests', () => {
  describe('Main index exports', () => {
    it('should export runEnhancers', () => {
      expect(typeof runEnhancers).toBe('function');
    });

    it('should export runProjectEnhancers', () => {
      expect(typeof runProjectEnhancers).toBe('function');
    });

    it('should export buildSourceCodeMap', () => {
      expect(typeof buildSourceCodeMap).toBe('function');
    });

    it('should export readSourceFile', () => {
      expect(typeof readSourceFile).toBe('function');
    });

    it('should export getRelativePath', () => {
      expect(typeof getRelativePath).toBe('function');
    });

    it('should export collectSemanticIssues', () => {
      expect(typeof collectSemanticIssues).toBe('function');
    });

    it('should export detectHighCoupling', () => {
      expect(typeof detectHighCoupling).toBe('function');
    });

    it('should export detectCriticalRisk', () => {
      expect(typeof detectCriticalRisk).toBe('function');
    });

    it('should export enhanceSystemMap (legacy)', () => {
      expect(typeof enhanceSystemMap).toBe('function');
    });

    it('should export enrichSystemMap (legacy alias)', () => {
      expect(typeof enrichSystemMap).toBe('function');
      expect(enrichSystemMap).toBe(enhanceSystemMap);
    });

    it('should export enrichConnections', () => {
      expect(typeof enrichConnections).toBe('function');
    });

    it('should export enhanceMetadata', () => {
      expect(typeof enhanceMetadata).toBe('function');
    });
  });

  describe('Direct module exports', () => {
    it('should export enrichConnections from connection-enricher', () => {
      expect(typeof enrichConnectionsDirect).toBe('function');
    });

    it('should export enhanceMetadata from metadata-enhancer', () => {
      expect(typeof enhanceMetadataDirect).toBe('function');
    });

    it('should export extractInheritedConnections from ancestry', () => {
      expect(typeof extractInheritedConnections).toBe('function');
    });

    it('should export calculateAverageVibration from ancestry', () => {
      expect(typeof calculateAverageVibration).toBe('function');
    });

    it('should export detectConnectionConflicts from conflicts', () => {
      expect(typeof detectConnectionConflicts).toBe('function');
    });

    it('should export hasCriticalConflicts from conflicts', () => {
      expect(typeof hasCriticalConflicts).toBe('function');
    });

    it('should export groupConflictsBySeverity from conflicts', () => {
      expect(typeof groupConflictsBySeverity).toBe('function');
    });

    it('should export extractDataFlowConnections from dataflow', () => {
      expect(typeof extractDataFlowConnections).toBe('function');
    });

    it('should export generateTypeKey from dataflow', () => {
      expect(typeof generateTypeKey).toBe('function');
    });

    it('should export calculateDataFlowConfidence from dataflow', () => {
      expect(typeof calculateDataFlowConfidence).toBe('function');
    });

    it('should export calculateAllWeights from weights', () => {
      expect(typeof calculateAllWeights).toBe('function');
    });

    it('should export calculateConnectionWeight from weights', () => {
      expect(typeof calculateConnectionWeight).toBe('function');
    });

    it('should export getConnectionCategory from weights', () => {
      expect(typeof getConnectionCategory).toBe('function');
    });

    it('should export getWeightStats from weights', () => {
      expect(typeof getWeightStats).toBe('function');
    });
  });

  describe('Orchestrators index exports', () => {
    it('should export runEnhancers', () => {
      expect(typeof runEnhancersDirect).toBe('function');
    });

    it('should export runProjectEnhancers', () => {
      expect(typeof runProjectEnhancersDirect).toBe('function');
    });
  });

  describe('Legacy index exports', () => {
    it('should export enhanceSystemMap', () => {
      expect(typeof enhanceSystemMapDirect).toBe('function');
    });

    it('should export enrichSystemMap as alias', () => {
      expect(typeof enrichSystemMapDirect).toBe('function');
      expect(enrichSystemMapDirect).toBe(enhanceSystemMapDirect);
    });
  });

  describe('Interface contracts', () => {
    describe('runEnhancers', () => {
      it('should accept context with atoms and filePath', async () => {
        const context = {
          atoms: [{ id: 'atom-1' }],
          filePath: 'test.js'
        };

        const result = await runEnhancers(context);

        expect(result).toBeDefined();
        expect(result.atoms).toBeDefined();
      });
    });

    describe('runProjectEnhancers', () => {
      it('should accept allAtoms and projectMetadata', async () => {
        const allAtoms = [{ id: 'atom-1' }];
        const projectMetadata = { totalFiles: 1 };

        const result = await runProjectEnhancers(allAtoms, projectMetadata);

        expect(result).toHaveProperty('connections');
        expect(result).toHaveProperty('metadata');
      });
    });

    describe('enrichConnections', () => {
      it('should accept atoms array', async () => {
        const atoms = [{ id: 'atom-1' }];

        const result = await enrichConnectionsDirect(atoms);

        expect(result).toHaveProperty('connections');
        expect(result).toHaveProperty('conflicts');
        expect(result).toHaveProperty('stats');
      });
    });

    describe('enhanceMetadata', () => {
      it('should accept context with atoms', async () => {
        const context = {
          atoms: [{ id: 'atom-1', complexity: 5 }],
          filePath: 'test.js'
        };

        const result = await enhanceMetadataDirect(context);

        expect(result.atoms).toBeDefined();
        expect(result.atoms[0].metrics).toBeDefined();
      });
    });

    describe('getConnectionCategory', () => {
      it('should return string category', () => {
        const result = getConnectionCategory(1.0);

        expect(typeof result).toBe('string');
        expect(['critical', 'strong', 'medium', 'weak']).toContain(result);
      });
    });

    describe('hasCriticalConflicts', () => {
      it('should return boolean', () => {
        const result = hasCriticalConflicts([]);

        expect(typeof result).toBe('boolean');
      });
    });

    describe('generateTypeKey', () => {
      it('should return string key', () => {
        const result = generateTypeKey({ type: 'User' });

        expect(typeof result).toBe('string');
      });
    });

    describe('calculateDataFlowConfidence', () => {
      it('should return number between 0 and 1', () => {
        const source = { atom: { filePath: 'a.js' }, output: {} };
        const input = {};

        const result = calculateDataFlowConfidence(source, input);

        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Error handling contracts', () => {
    it('runEnhancers should handle empty atoms', async () => {
      const context = { atoms: [], filePath: 'test.js' };
      
      const result = await runEnhancers(context);

      expect(result).toBeDefined();
    });

    it('runProjectEnhancers should handle empty atoms', async () => {
      const result = await runProjectEnhancers([], {});

      expect(result.connections).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('enrichConnections should handle empty atoms', async () => {
      const result = await enrichConnectionsDirect([]);

      expect(result.connections).toEqual([]);
      expect(result.conflicts).toEqual([]);
    });

    it('calculateAverageVibration should handle empty atoms', () => {
      const result = calculateAverageVibration([]);

      expect(result).toBe(0);
    });

    it('groupConflictsBySeverity should handle empty conflicts', () => {
      const result = groupConflictsBySeverity([]);

      expect(result).toEqual({});
    });

    it('getWeightStats should handle empty connections', () => {
      const result = getWeightStats([]);

      expect(result.average).toBe(0);
      expect(result.max).toBe(0);
      expect(result.min).toBe(0);
    });
  });
});
