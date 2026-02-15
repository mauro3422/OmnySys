/**
 * @fileoverview File API Tests
 * 
 * Tests for file-level query operations.
 * 
 * @module tests/unit/layer-a-analysis/query/apis/file-api
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFileAnalysis,
  getMultipleFileAnalysis,
  getFileDependencies,
  getFileDependents,
  getFileAnalysisWithAtoms,
  getAtomDetails,
  findAtomsByArchetype,
  readJSON,
  readMultipleJSON,
  fileExists
} from '#layer-a/query/apis/file-api.js';
import { FileDataBuilder, QueryScenarios } from '../../../../factories/query-test.factory.js';

vi.mock('#layer-a/query/readers/json-reader.js', () => ({
  readJSON: vi.fn(),
  readMultipleJSON: vi.fn(),
  fileExists: vi.fn()
}));

vi.mock('#layer-a/storage/storage-manager.js', () => ({
  getDataDirectory: vi.fn((projectPath) => `${projectPath}/.omnysysdata`),
  loadAtoms: vi.fn(),
  loadMolecule: vi.fn()
}));

vi.mock('#shared/derivation-engine.js', () => ({
  composeMolecularMetadata: vi.fn((path, atoms) => ({
    totalComplexity: atoms.reduce((sum, a) => sum + (a.complexity || 1), 0),
    atomCount: atoms.length
  }))
}));

describe('File API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export getFileAnalysis function', () => {
      expect(typeof getFileAnalysis).toBe('function');
    });

    it('should export getMultipleFileAnalysis function', () => {
      expect(typeof getMultipleFileAnalysis).toBe('function');
    });

    it('should export getFileDependencies function', () => {
      expect(typeof getFileDependencies).toBe('function');
    });

    it('should export getFileDependents function', () => {
      expect(typeof getFileDependents).toBe('function');
    });

    it('should export getFileAnalysisWithAtoms function', () => {
      expect(typeof getFileAnalysisWithAtoms).toBe('function');
    });

    it('should export getAtomDetails function', () => {
      expect(typeof getAtomDetails).toBe('function');
    });

    it('should export findAtomsByArchetype function', () => {
      expect(typeof findAtomsByArchetype).toBe('function');
    });

    it('should export readJSON function', () => {
      expect(typeof readJSON).toBe('function');
    });

    it('should export readMultipleJSON function', () => {
      expect(typeof readMultipleJSON).toBe('function');
    });

    it('should export fileExists function', () => {
      expect(typeof fileExists).toBe('function');
    });
  });

  describe('getFileAnalysis', () => {
    it('should return file analysis object', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = FileDataBuilder.create('src/main.js')
        .withAtom({ name: 'main', type: 'function' })
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getFileAnalysis('/test/project', 'src/main.js');
      
      expect(result).toBeDefined();
      expect(result.path).toBe('src/main.js');
    });

    it('should handle absolute paths', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue(FileDataBuilder.create('src/main.js').build());

      const result = await getFileAnalysis('/test/project', '/test/project/src/main.js');
      
      expect(result).toBeDefined();
    });

    it('should include atoms in analysis', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = FileDataBuilder.create('src/main.js')
        .withAtom({ name: 'func1', type: 'function' })
        .withAtom({ name: 'func2', type: 'function' })
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getFileAnalysis('/test/project', 'src/main.js');
      
      expect(result.atoms).toBeDefined();
      expect(Array.isArray(result.atoms)).toBe(true);
    });
  });

  describe('getMultipleFileAnalysis', () => {
    it('should analyze multiple files', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON
        .mockResolvedValueOnce(FileDataBuilder.create('src/a.js').build())
        .mockResolvedValueOnce(FileDataBuilder.create('src/b.js').build());

      const result = await getMultipleFileAnalysis('/test/project', ['src/a.js', 'src/b.js']);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should return null for failed files', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON
        .mockResolvedValueOnce(FileDataBuilder.create('src/a.js').build())
        .mockRejectedValueOnce(new Error('Not found'));

      const result = await getMultipleFileAnalysis('/test/project', ['src/a.js', 'src/b.js']);
      
      expect(result[0]).not.toBeNull();
      expect(result[1]).toBeNull();
    });
  });

  describe('getFileDependencies', () => {
    it('should return array of dependency sources', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = FileDataBuilder.create('src/main.js')
        .withImport('./utils.js')
        .withImport('./helpers.js')
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getFileDependencies('/test/project', 'src/main.js');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('./utils.js');
      expect(result).toContain('./helpers.js');
    });

    it('should return empty array when no imports', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue(FileDataBuilder.create('src/main.js').build());

      const result = await getFileDependencies('/test/project', 'src/main.js');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('getFileDependents', () => {
    it('should return array of dependent files', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const mockData = FileDataBuilder.create('src/utils.js')
        .withUsedBy(['src/main.js', 'src/app.js'])
        .build();
      
      readJSON.mockResolvedValue(mockData);

      const result = await getFileDependents('/test/project', 'src/utils.js');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('src/main.js');
      expect(result).toContain('src/app.js');
    });

    it('should return empty array when no dependents', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockResolvedValue(FileDataBuilder.create('src/main.js').build());

      const result = await getFileDependents('/test/project', 'src/main.js');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('getFileAnalysisWithAtoms', () => {
    it('should return enriched analysis', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      
      readJSON.mockResolvedValue(FileDataBuilder.create('src/main.js')
        .withAtom({ name: 'test', type: 'function' })
        .build());
      loadAtoms.mockResolvedValue([{ name: 'test', type: 'function' }]);

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js');
      
      expect(result).toBeDefined();
      expect(result.atoms).toBeDefined();
    });

    it('should include derived metadata', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      
      readJSON.mockResolvedValue(FileDataBuilder.create('src/main.js')
        .withAtom({ name: 'test', type: 'function', complexity: 5 })
        .build());
      loadAtoms.mockResolvedValue([{ name: 'test', type: 'function', complexity: 5 }]);

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js');
      
      expect(result.derived).toBeDefined();
    });

    it('should handle cache parameter', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      
      readJSON.mockResolvedValue(FileDataBuilder.create('src/main.js').build());
      loadAtoms.mockResolvedValue([]);

      const mockCache = {
        getDerivedMetadata: vi.fn().mockReturnValue(null),
        setDerivedMetadata: vi.fn()
      };

      const result = await getFileAnalysisWithAtoms('/test/project', 'src/main.js', mockCache);
      
      expect(result).toBeDefined();
    });
  });

  describe('getAtomDetails', () => {
    it('should return atom details', async () => {
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      loadAtoms.mockResolvedValue([
        { name: 'myFunction', type: 'function', line: 10 }
      ]);

      const result = await getAtomDetails('/test/project', 'src/main.js', 'myFunction');
      
      expect(result).toBeDefined();
      expect(result.name).toBe('myFunction');
    });

    it('should return null for non-existent atom', async () => {
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      loadAtoms.mockResolvedValue([]);

      const result = await getAtomDetails('/test/project', 'src/main.js', 'nonExistent');
      
      expect(result).toBeNull();
    });

    it('should use cache when provided', async () => {
      const cachedAtom = { name: 'cachedFunc', type: 'function' };
      const mockCache = {
        getAtom: vi.fn().mockReturnValue(cachedAtom),
        setAtom: vi.fn()
      };

      const result = await getAtomDetails('/test/project', 'src/main.js', 'cachedFunc', mockCache);
      
      expect(result).toBe(cachedAtom);
    });
  });

  describe('findAtomsByArchetype', () => {
    it('should return array', async () => {
      const result = await findAtomsByArchetype('/test/project', 'dead-function');
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error Handling Contract', () => {
    it('should throw on file read error', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockRejectedValue(new Error('Read failed'));

      await expect(getFileAnalysis('/test/project', 'src/main.js')).rejects.toThrow('Read failed');
    });

    it('should handle missing file gracefully in getMultipleFileAnalysis', async () => {
      const { readJSON } = await import('#layer-a/query/readers/json-reader.js');
      readJSON.mockRejectedValue(new Error('Not found'));

      const result = await getMultipleFileAnalysis('/test/project', ['src/missing.js']);
      
      expect(result[0]).toBeNull();
    });
  });
});
