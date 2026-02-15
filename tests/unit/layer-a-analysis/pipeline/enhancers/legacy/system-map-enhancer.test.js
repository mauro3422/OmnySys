import { describe, it, expect, vi } from 'vitest';
import { enhanceSystemMap, enrichSystemMap } from '#layer-a/pipeline/enhancers/legacy/system-map-enhancer.js';

describe('System Map Enhancer (Legacy, real modules)', () => {
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
    it('returns enhanced system map with minimum structure', async () => {
      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('files');
      expect(result.metadata.enhanced).toBe(true);
    });

    it('marks as enhanced in metadata', async () => {
      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);
      expect(result.metadata.enhanced).toBe(true);
      expect(result.metadata.enhancedAt).toBeDefined();
    });

    it('does not mutate original system map', async () => {
      const original = JSON.parse(JSON.stringify(mockSystemMap));
      await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);
      expect(mockSystemMap).toEqual(original);
    });

    it('ensures fallback connection/risk/issue structure when internals fail', async () => {
      const result = await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, false);
      expect(result).toHaveProperty('connections');
      expect(result).toHaveProperty('riskAssessment');
      expect(result).toHaveProperty('semanticIssues');
      expect(result.connections).toHaveProperty('total');
      expect(result.riskAssessment).toHaveProperty('scores');
      expect(result.semanticIssues).toHaveProperty('stats');
    });
  });

  describe('enrichSystemMap (alias)', () => {
    it('is exported as alias', () => {
      expect(enrichSystemMap).toBe(enhanceSystemMap);
    });
  });

  describe('integration scenarios', () => {
    it('works in verbose mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await enhanceSystemMap(mockRootPath, mockParsedFiles, mockSystemMap, true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
