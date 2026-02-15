/**
 * @fileoverview Atom Query Tests
 * 
 * Tests for atom-level query implementations.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/file-query/atoms/atom-query
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAtomDetails,
  findAtomsByArchetype
} from '#layer-a/query/queries/file-query/atoms/atom-query.js';

vi.mock('#layer-a/storage/storage-manager.js', () => ({
  loadAtoms: vi.fn()
}));

describe('Atom Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export getAtomDetails function', () => {
      expect(typeof getAtomDetails).toBe('function');
    });

    it('should export findAtomsByArchetype function', () => {
      expect(typeof findAtomsByArchetype).toBe('function');
    });

    it('getAtomDetails should accept rootPath, filePath, functionName, and optional cache', () => {
      expect(getAtomDetails.length).toBeGreaterThanOrEqual(3);
    });

    it('findAtomsByArchetype should accept rootPath and archetypeType', () => {
      expect(findAtomsByArchetype.length).toBe(2);
    });
  });

  describe('getAtomDetails', () => {
    it('should return atom by name', async () => {
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      loadAtoms.mockResolvedValue([
        { name: 'func1', type: 'function', line: 10 },
        { name: 'func2', type: 'function', line: 20 }
      ]);

      const result = await getAtomDetails('/test/project', 'src/main.js', 'func1');
      
      expect(result).toBeDefined();
      expect(result.name).toBe('func1');
      expect(result.line).toBe(10);
    });

    it('should return null when atom not found', async () => {
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      loadAtoms.mockResolvedValue([
        { name: 'func1', type: 'function', line: 10 }
      ]);

      const result = await getAtomDetails('/test/project', 'src/main.js', 'nonExistent');
      
      expect(result).toBeNull();
    });

    it('should return null when no atoms', async () => {
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      loadAtoms.mockResolvedValue([]);

      const result = await getAtomDetails('/test/project', 'src/main.js', 'func1');
      
      expect(result).toBeNull();
    });

    it('should use cache when provided', async () => {
      const cachedAtom = { name: 'cachedFunc', type: 'function', line: 5 };
      const mockCache = {
        getAtom: vi.fn().mockReturnValue(cachedAtom),
        setAtom: vi.fn()
      };

      const result = await getAtomDetails('/test/project', 'src/main.js', 'cachedFunc', mockCache);
      
      expect(result).toBe(cachedAtom);
      expect(mockCache.getAtom).toHaveBeenCalled();
    });

    it('should set cache after loading from disk', async () => {
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      const atom = { name: 'func1', type: 'function', line: 10 };
      loadAtoms.mockResolvedValue([atom]);
      
      const mockCache = {
        getAtom: vi.fn().mockReturnValue(null),
        setAtom: vi.fn()
      };

      await getAtomDetails('/test/project', 'src/main.js', 'func1', mockCache);
      
      expect(mockCache.setAtom).toHaveBeenCalled();
    });

    it('should build correct atom ID', async () => {
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      loadAtoms.mockResolvedValue([{ name: 'myFunc', type: 'function' }]);
      
      const mockCache = {
        getAtom: vi.fn((id) => {
          // Check that ID contains file path and function name
          expect(id).toContain('src_main');
          expect(id).toContain('myFunc');
          return null;
        }),
        setAtom: vi.fn()
      };

      await getAtomDetails('/test/project', 'src/main.js', 'myFunc', mockCache);
    });

    it('should handle path separators in atom ID', async () => {
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      loadAtoms.mockResolvedValue([{ name: 'func1', type: 'function' }]);
      
      const mockCache = {
        getAtom: vi.fn().mockReturnValue(null),
        setAtom: vi.fn()
      };

      await getAtomDetails('/test/project', 'src/deep/nested/file.js', 'func1', mockCache);
      
      const atomId = mockCache.setAtom.mock.calls[0][0];
      expect(atomId).not.toContain('/');
      expect(atomId).not.toContain('\\');
    });

    it('should work without cache', async () => {
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      loadAtoms.mockResolvedValue([{ name: 'func1', type: 'function', line: 10 }]);

      const result = await getAtomDetails('/test/project', 'src/main.js', 'func1');
      
      expect(result).toBeDefined();
      expect(result.name).toBe('func1');
    });

    it('should propagate loadAtoms errors', async () => {
      const { loadAtoms } = await import('#layer-a/storage/storage-manager.js');
      loadAtoms.mockRejectedValue(new Error('Load failed'));

      await expect(getAtomDetails('/test/project', 'src/main.js', 'func1'))
        .rejects.toThrow('Load failed');
    });
  });

  describe('findAtomsByArchetype', () => {
    it('should return empty array', async () => {
      const result = await findAtomsByArchetype('/test/project', 'dead-function');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should accept archetype type parameter', async () => {
      const result = await findAtomsByArchetype('/test/project', 'hot-path');
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle different archetype types', async () => {
      const archetypes = ['dead-function', 'hot-path', 'fragile-network'];
      
      for (const archetype of archetypes) {
        const result = await findAtomsByArchetype('/test/project', archetype);
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });
});
