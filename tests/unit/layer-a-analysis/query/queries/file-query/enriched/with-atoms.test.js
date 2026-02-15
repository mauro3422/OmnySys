/**
 * @fileoverview With Atoms Query Tests
 * 
 * Tests for enriched file analysis with atoms.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/file-query/enriched/with-atoms
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFileAnalysisWithAtoms } from '#layer-a/query/queries/file-query/enriched/with-atoms.js';
import { FileDataBuilder } from '../../../../../../factories/query-test.factory.js';

vi.mock('#layer-a/query/queries/file-query/core/single-file.js', () => ({
  getFileAnalysis: vi.fn()
}));

vi.mock('#layer-a/storage/storage-manager.js', () => ({
  loadAtoms: vi.fn(),
  loadMolecule: vi.fn()
}));

vi.mock('#shared/derivation-engine.js', () => ({
  composeMolecularMetadata: vi.fn((path, atoms) => ({
    totalComplexity: atoms.reduce((sum, a) => sum + (a.complexity || 1), 0),
    atomCount: atoms.length,
    archetypes: []
  }))
}));

describe('With Atoms Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export getFileAnalysisWithAtoms function', () => {
      expect(typeof getFileAnalysisWithAtoms).toBe('function');
    });

    it('should accept rootPath, filePath, and optional cache', () => {
      expect(getFileAnalysisWithAtoms.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getFileAnalysisWithAtoms', () => {
    it('should return enriched analysis', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { loadAtoms, loadMolecule } = await import('#layer-a/storage/storage-manager.js');
      
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js')
        .withAtom({ name: 'func1', id: 'atom1' })
        .build());
      loadAtoms.mockResolvedValue([{ name: 'func1', id: 'atom1' }]);
      loadMolecule.mockResolvedValue({ id: 'mol1', atoms: ['atom1'] });

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js');
      
      expect(result).toBeDefined();
      expect(result.atoms).toBeDefined();
      expect(result.molecule).toBeDefined();
      expect(result.derived).toBeDefined();
    });

    it('should include atoms from storage', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      
      const mockAtoms = [
        { name: 'func1', id: 'a1', complexity: 5 },
        { name: 'func2', id: 'a2', complexity: 3 }
      ];
      
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());
      loadAtoms.mockResolvedValue(mockAtoms);

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js');
      
      expect(result.atoms).toHaveLength(2);
      expect(result.atoms[0].name).toBe('func1');
    });

    it('should include molecule data', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { loadMolecule } = await import('#layer-a/storage/storage-manager.js');
      
      const mockMolecule = { id: 'mol1', cohesion: 0.8 };
      
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());
      loadMolecule.mockResolvedValue(mockMolecule);

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js');
      
      expect(result.molecule).toEqual(mockMolecule);
    });

    it('should include derived metadata', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      const { composeMolecularMetadata } = await import('#shared/derivation-engine.js');
      
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());
      loadAtoms.mockResolvedValue([{ name: 'f1', complexity: 5 }]);

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js');
      
      expect(result.derived).toBeDefined();
      expect(composeMolecularMetadata).toHaveBeenCalled();
    });

    it('should include stats', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js')
        .withAtom({ name: 'f1', isExported: true, complexity: 5 })
        .withAtom({ name: 'f2', isExported: false, complexity: 3 })
        .build());
      loadAtoms.mockResolvedValue([
        { name: 'f1', isExported: true, complexity: 5 },
        { name: 'f2', isExported: false, complexity: 3 }
      ]);

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js');
      
      expect(result.stats).toBeDefined();
      expect(result.stats.totalAtoms).toBe(2);
    });

    it('should handle empty atoms', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());
      loadAtoms.mockResolvedValue([]);

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js');
      
      expect(result.atoms).toEqual([]);
      expect(result.molecule).toBeNull();
      expect(result.derived).toBeNull();
    });

    it('should return null when analysis not found', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockResolvedValue(null);

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js');
      
      expect(result).toBeNull();
    });
  });

  describe('Cache Integration', () => {
    it('should check cache first', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const cachedData = {
        atoms: [{ name: 'cached' }],
        molecule: { id: 'cached' },
        derived: { totalComplexity: 10 },
        stats: { totalAtoms: 1 }
      };
      const mockCache = {
        getDerivedMetadata: vi.fn().mockReturnValue(cachedData)
      };
      
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js', mockCache);
      
      expect(result).toEqual(expect.objectContaining(cachedData));
      expect(mockCache.getDerivedMetadata).toHaveBeenCalledWith('src/main.js');
    });

    it('should set cache after computing', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      
      const mockCache = {
        getDerivedMetadata: vi.fn().mockReturnValue(null),
        setDerivedMetadata: vi.fn()
      };
      
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());
      loadAtoms.mockResolvedValue([{ name: 'f1' }]);

      await getFileAnalysisWithAtoms('/test/project', 'src/main.js', mockCache);
      
      expect(mockCache.setDerivedMetadata).toHaveBeenCalledWith(
        'src/main.js',
        expect.objectContaining({
          atoms: expect.any(Array),
          molecule: expect.anything(),
          derived: expect.any(Object),
          stats: expect.any(Object)
        })
      );
    });

    it('should work without cache', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());
      loadAtoms.mockResolvedValue([{ name: 'f1' }]);

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js');
      
      expect(result).toBeDefined();
      expect(result.atoms).toBeDefined();
    });
  });

  describe('Error Handling Contract', () => {
    it('should propagate getFileAnalysis errors', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      getFileAnalysis.mockRejectedValue(new Error('Analysis failed'));

      await expect(getFileAnalysisWithAtoms('/test/project', 'src/main.js'))
        .rejects.toThrow('Analysis failed');
    });

    it('should handle loadAtoms errors', async () => {
      const { getFileAnalysis } = await import('#layer-a/query/queries/file-query/core/single-file.js');
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      
      getFileAnalysis.mockResolvedValue(FileDataBuilder.create('src/main.js').build());
      loadAtoms.mockRejectedValue(new Error('Atoms failed'));

      await expect(getFileAnalysisWithAtoms('/test/project', 'src/main.js'))
        .rejects.toThrow('Atoms failed');
    });
  });
});
