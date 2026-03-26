/**
 * @fileoverview Unit tests for file-query/enriched/with-atoms.js
 * @module tests/unit/layer-c-memory/query/queries/file-query-enriched-with-atoms
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getFileAnalysisWithAtoms } from '#layer-c/query/queries/file-query/enriched/with-atoms.js';
import { getFileAnalysis } from '#layer-c/query/queries/file-query/core/single-file.js';
import { loadAtoms, loadMolecule } from '#layer-c/storage/index.js';
import { composeMolecularMetadata } from '#shared/derivation-engine/index.js';

// Hoist mocks to top level
vi.mock('#layer-c/query/queries/file-query/core/single-file.js');
vi.mock('#layer-c/storage/index.js');
vi.mock('#shared/derivation-engine/index.js');

describe('getFileAnalysisWithAtoms', () => {
  const rootPath = 'C:/Dev/OmnySystem';
  const filePath = 'src/test-file.js';

  const mockFileAnalysis = {
    file: filePath,
    path: filePath,
    lastAnalyzed: new Date().toISOString(),
    atomCount: 3,
    totalComplexity: 25,
    totalLines: 150,
    moduleName: 'test-module',
    imports: ['lodash'],
    exports: [{ name: 'exportedFunc', kind: 'function' }],
    atoms: [],
    atomIds: ['src_test-file_js::func1', 'src_test-file_js::func2', 'src_test-file_js::func3'],
    compilerSignals: {
      testability: { score: 0.7 },
      semanticPurity: { score: 0.8 }
    },
    definitions: [],
    usedBy: [],
    importedBy: []
  };

  const mockAtoms = [
    {
      id: 'src_test-file_js::func1',
      name: 'func1',
      file_path: filePath,
      line_start: 1,
      line_end: 30,
      complexity: 8,
      atom_type: 'function',
      isExported: true,
      is_async: false,
      archetype: { type: 'core-function' },
      propagation_score: 0.5,
      coupling_score: 0.3,
      fragility_score: 0.4,
      centrality_score: 40,
      has_network_calls: false,
      has_error_handling: true
    },
    {
      id: 'src_test-file_js::func2',
      name: 'func2',
      file_path: filePath,
      line_start: 31,
      line_end: 60,
      complexity: 12,
      atom_type: 'arrow',
      isExported: true,
      is_async: true,
      archetype: { type: 'hot-path' },
      propagation_score: 0.7,
      coupling_score: 0.6,
      fragility_score: 0.8,
      centrality_score: 70,
      has_network_calls: true,
      has_error_handling: false
    },
    {
      id: 'src_test-file_js::func3',
      name: 'func3',
      file_path: filePath,
      line_start: 61,
      line_end: 80,
      complexity: 5,
      atom_type: 'function',
      isExported: false,
      is_async: false,
      archetype: { type: 'dead-function' },
      propagation_score: 0.1,
      coupling_score: 0.2,
      fragility_score: 0.3,
      centrality_score: 10,
      has_network_calls: false,
      has_error_handling: true
    }
  ];

  const mockMolecule = {
    file_path: filePath,
    total_complexity: 25,
    total_lines: 150,
    atom_count: 3,
    cohesion_score: 0.65,
    coupling_score: 0.45,
    instability: 0.5
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getFileAnalysis.mockResolvedValue(mockFileAnalysis);
    loadAtoms.mockResolvedValue(mockAtoms);
    loadMolecule.mockResolvedValue(mockMolecule);
    composeMolecularMetadata.mockReturnValue({
      totalComplexity: 25,
      averageComplexity: 8.3,
      cohesionScore: 0.65,
      couplingScore: 0.45,
      instability: 0.5,
      networkExposure: 0.3,
      errorHandlingCoverage: 0.67
    });
  });

  describe('basic functionality', () => {
    it('returns enriched file analysis with atoms', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result).toHaveProperty('file', filePath);
      expect(result).toHaveProperty('atoms');
      expect(Array.isArray(result.atoms)).toBe(true);
      expect(result.atoms.length).toBe(3);
    });

    it('includes molecule data', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result).toHaveProperty('molecule');
      expect(result.molecule).toEqual(mockMolecule);
    });

    it('includes derived molecular metadata', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result).toHaveProperty('derived');
      expect(result.derived).toHaveProperty('totalComplexity');
      expect(result.derived).toHaveProperty('averageComplexity');
      expect(result.derived).toHaveProperty('cohesionScore');
      expect(result.derived).toHaveProperty('couplingScore');
    });

    it('includes statistics', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('totalAtoms', 3);
      expect(result.stats).toHaveProperty('exportedAtoms');
      expect(result.stats).toHaveProperty('deadAtoms');
      expect(result.stats).toHaveProperty('hotPathAtoms');
      expect(result.stats).toHaveProperty('totalComplexity');
      expect(result.stats).toHaveProperty('averageComplexity');
    });

    it('includes compiler signals', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.compilerSignals).toHaveProperty('testability');
      expect(result.compilerSignals).toHaveProperty('semanticPurity');
    });
  });

  describe('cache integration', () => {
    it('uses cached derived metadata when available', async () => {
      const mockCache = {
        getDerivedMetadata: vi.fn().mockReturnValue({
          atoms: mockAtoms,
          molecule: mockMolecule,
          derived: { totalComplexity: 30 },
          stats: { totalAtoms: 3 }
        }),
        setDerivedMetadata: vi.fn()
      };

      const result = await getFileAnalysisWithAtoms(rootPath, filePath, mockCache);

      expect(mockCache.getDerivedMetadata).toHaveBeenCalledWith(filePath);
      expect(getFileAnalysis).toHaveBeenCalled();
      expect(loadAtoms).not.toHaveBeenCalled();
      expect(loadMolecule).not.toHaveBeenCalled();
      expect(result.derived.totalComplexity).toBe(30);
    });

    it('loads atoms from cache when partially available', async () => {
      const mockCache = {
        getDerivedMetadata: vi.fn().mockReturnValue(null),
        getAtoms: vi.fn().mockReturnValue({
          found: new Map([['src_test-file_js::func1', mockAtoms[0]]]),
          missing: ['src_test-file_js::func2', 'src_test-file_js::func3']
        }),
        setAtom: vi.fn(),
        setDerivedMetadata: vi.fn()
      };

      await getFileAnalysisWithAtoms(rootPath, filePath, mockCache);

      expect(mockCache.getAtoms).toHaveBeenCalled();
      expect(loadAtoms).toHaveBeenCalled();
      expect(mockCache.setAtom).toHaveBeenCalledTimes(2);
    });

    it('caches derived metadata after loading', async () => {
      const mockCache = {
        getDerivedMetadata: vi.fn().mockReturnValue(null),
        setDerivedMetadata: vi.fn()
      };

      await getFileAnalysisWithAtoms(rootPath, filePath, mockCache);

      expect(mockCache.setDerivedMetadata).toHaveBeenCalledWith(
        filePath,
        expect.objectContaining({
          atoms: mockAtoms,
          molecule: mockMolecule,
          derived: expect.any(Object),
          stats: expect.any(Object)
        })
      );
    });

    it('handles cache without getDerivedMetadata method', async () => {
      const mockCache = {
        getAtoms: vi.fn().mockReturnValue({
          found: new Map(),
          missing: ['src_test-file_js::func1', 'src_test-file_js::func2', 'src_test-file_js::func3']
        }),
        setAtom: vi.fn()
      };

      const result = await getFileAnalysisWithAtoms(rootPath, filePath, mockCache);

      expect(result).toHaveProperty('atoms');
      expect(loadAtoms).toHaveBeenCalled();
    });

    it('handles cache without getAtoms method', async () => {
      const mockCache = {
        getDerivedMetadata: vi.fn().mockReturnValue(null),
        setDerivedMetadata: vi.fn()
      };

      const result = await getFileAnalysisWithAtoms(rootPath, filePath, mockCache);

      expect(result.atoms.length).toBe(3);
      expect(loadAtoms).toHaveBeenCalled();
    });

    it('works without cache', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath, null);

      expect(result.atoms.length).toBe(3);
      expect(loadAtoms).toHaveBeenCalled();
    });
  });

  describe('statistics calculation', () => {
    it('counts exported atoms correctly', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.stats.exportedAtoms).toBe(2);
    });

    it('counts dead function atoms', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.stats.deadAtoms).toBe(1);
    });

    it('counts hot path atoms', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.stats.hotPathAtoms).toBe(1);
    });

    it('calculates average complexity', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.stats.averageComplexity).toBeCloseTo(8.3, 1);
    });

    it('rounds average complexity to one decimal', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.stats.averageComplexity).toBe(8.3);
    });
  });

  describe('edge cases', () => {
    it('returns null when file analysis returns null', async () => {
      getFileAnalysis.mockResolvedValue(null);

      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result).toBeNull();
    });

    it('handles file with no atoms', async () => {
      loadAtoms.mockResolvedValue([]);

      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.atoms).toEqual([]);
      expect(result.molecule).toBeNull();
      expect(result.derived).toBeNull();
    });

    it('handles file with null molecule', async () => {
      loadMolecule.mockResolvedValue(null);

      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.molecule).toBeNull();
      expect(result.derived).toBeDefined();
    });

    it('handles composeMolecularMetadata returning null', async () => {
      composeMolecularMetadata.mockReturnValue(null);

      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.derived).toBeNull();
    });
  });

  describe('compiler signals', () => {
    it('summarizes atom testability', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.compilerSignals.testability).toBeDefined();
    });

    it('summarizes atom semantic purity', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.compilerSignals.semanticPurity).toBeDefined();
    });

    it('uses updated atoms list for compiler signals', async () => {
      const updatedAtoms = [
        ...mockAtoms,
        {
          id: 'src_test-file_js::func4',
          name: 'func4',
          file_path: filePath,
          is_exported: true,
          archetype: { type: 'core-function' }
        }
      ];
      loadAtoms.mockResolvedValue(updatedAtoms);

      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.compilerSignals.testability).toBeDefined();
      expect(result.compilerSignals.semanticPurity).toBeDefined();
    });
  });

  describe('atom filtering', () => {
    it('filters fragile network atoms', async () => {
      const atomsWithFragile = [
        ...mockAtoms,
        {
          id: 'src_test-file_js::fragile',
          name: 'fragileFunc',
          file_path: filePath,
          archetype: { type: 'fragile-network' },
          is_exported: false
        }
      ];
      loadAtoms.mockResolvedValue(atomsWithFragile);

      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.stats.fragileNetworkAtoms).toBe(1);
    });

    it('handles multiple archetype types', async () => {
      const diverseAtoms = [
        { id: '1', name: 'a1', archetype: { type: 'core-function' }, isExported: true },
        { id: '2', name: 'a2', archetype: { type: 'dead-function' }, isExported: false },
        { id: '3', name: 'a3', archetype: { type: 'hot-path' }, isExported: true },
        { id: '4', name: 'a4', archetype: { type: 'fragile-network' }, isExported: false },
        { id: '5', name: 'a5', archetype: { type: 'core-function' }, isExported: false }
      ];
      loadAtoms.mockResolvedValue(diverseAtoms);
      composeMolecularMetadata.mockReturnValue({
        totalComplexity: 50,
        averageComplexity: 10
      });

      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result.stats.totalAtoms).toBe(5);
      expect(result.stats.exportedAtoms).toBe(2);
      expect(result.stats.deadAtoms).toBe(1);
      expect(result.stats.hotPathAtoms).toBe(1);
      expect(result.stats.fragileNetworkAtoms).toBe(1);
    });
  });

  describe('integration scenarios', () => {
    it('handles complete enrichment workflow', async () => {
      const result = await getFileAnalysisWithAtoms(rootPath, filePath);

      expect(result).toMatchObject({
        file: filePath,
        atoms: expect.arrayContaining([
          expect.objectContaining({ name: 'func1' }),
          expect.objectContaining({ name: 'func2' }),
          expect.objectContaining({ name: 'func3' })
        ]),
        molecule: mockMolecule,
        derived: expect.any(Object),
        stats: expect.any(Object),
        compilerSignals: expect.any(Object)
      });
    });

    it('handles cache miss then hit workflow', async () => {
      const mockCache = {
        getDerivedMetadata: vi.fn()
          .mockReturnValueOnce(null)
          .mockReturnValueOnce({
            atoms: mockAtoms,
            molecule: mockMolecule,
            derived: { totalComplexity: 25 },
            stats: { totalAtoms: 3 }
          }),
        setDerivedMetadata: vi.fn()
      };

      // First call - cache miss
      await getFileAnalysisWithAtoms(rootPath, filePath, mockCache);
      expect(loadAtoms).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      await getFileAnalysisWithAtoms(rootPath, filePath, mockCache);
      expect(loadAtoms).toHaveBeenCalledTimes(1);
    });
  });
});
