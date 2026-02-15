/**
 * @fileoverview system-map-enhancer.test.js
 * 
 * Tests for System Map Enhancer (Legacy)
 * Tests enhanceSystemMap
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/legacy/system-map-enhancer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enhanceSystemMap, enrichSystemMap } from '#layer-a/pipeline/enhancers/legacy/system-map-enhancer.js';

// Mock dependencies
vi.mock('#layer-a/extractors/static/index.js', () => ({
  detectAllSemanticConnections: vi.fn(() => ({
    localStorageConnections: [],
    eventConnections: [],
    globalConnections: [],
    envConnections: [],
    routeConnections: [],
    colocationConnections: [],
    all: [],
    fileResults: {}
  }))
}));

vi.mock('#layer-a/analyses/tier3/risk-scorer.js', () => ({
  calculateAllRiskScores: vi.fn(() => ({})),
  generateRiskReport: vi.fn(() => ({ summary: {} }))
}));

vi.mock('#layer-a/pipeline/enhancers/builders/source-code-builder.js', () => ({
  buildSourceCodeMap: vi.fn(() => Promise.resolve({}))
}));

vi.mock('#layer-a/pipeline/enhancers/analyzers/semantic-issue-analyzer.js', () => ({
  collectSemanticIssues: vi.fn(() => ({ issues: [], stats: { totalIssues: 0 } }))
}));

describe('System Map Enhancer (Legacy)', () => {
  const mockRootPath = '/test/project';
  const mockParsedFiles = {};
  const mockSystemMap = {
    metadata: {},
    files: {
      'src/test.js': {
        exports: [],
        imports: []
      }
    }
  };

  describe('enhanceSystemMap', () => {
    it('should return enhanced system map', async () => {
      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);

      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('files');
    });

    it('should mark as enhanced in metadata', async () => {
      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);

      expect(result.metadata.enhanced).toBe(true);
      expect(result.metadata.enhancedAt).toBeDefined();
    });

    it('should not mutate original system map', async () => {
      const original = JSON.parse(JSON.stringify(mockSystemMap));
      
      await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);

      expect(mockSystemMap).toEqual(original);
    });

    it('should add connections property', async () => {
      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);

      expect(result).toHaveProperty('connections');
      expect(result.connections).toHaveProperty('sharedState');
      expect(result.connections).toHaveProperty('eventListeners');
      expect(result.connections).toHaveProperty('envVars');
      expect(result.connections).toHaveProperty('routes');
      expect(result.connections).toHaveProperty('colocation');
      expect(result.connections).toHaveProperty('total');
    });

    it('should add riskAssessment property', async () => {
      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);

      expect(result).toHaveProperty('riskAssessment');
      expect(result.riskAssessment).toHaveProperty('scores');
      expect(result.riskAssessment).toHaveProperty('report');
    });

    it('should add semanticIssues property', async () => {
      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);

      expect(result).toHaveProperty('semanticIssues');
    });

    it('should handle empty system map', async () => {
      const emptyMap = { metadata: {}, files: {} };

      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, emptyMap, false);

      expect(result.metadata.enhanced).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, null, false);

      // Should not throw and should return something
      expect(result).toBeDefined();
    });
  });

  describe('enrichSystemMap (alias)', () => {
    it('should be exported as alias', () => {
      expect(enrichSystemMap).toBe(enhanceSystemMap);
    });

    it('should work the same as enhanceSystemMap', async () => {
      const result = await enrichSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);

      expect(result.metadata.enhanced).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should work with verbose mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, true);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should work with skipLLM flag', async () => {
      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false, true);

      expect(result.metadata.enhanced).toBe(true);
    });
  });
});
