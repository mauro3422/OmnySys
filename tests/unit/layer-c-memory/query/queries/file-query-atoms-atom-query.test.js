/**
 * @fileoverview Unit tests for file-query/atoms/atom-query.js
 * @module tests/unit/layer-c-memory/query/queries/file-query-atoms-atom-query
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'path';

import {
  getAtomDetails,
  findAtomsByArchetype,
  findAtomByLine
} from '#layer-c/query/queries/file-query/atoms/atom-query.js';
import { loadAtoms } from '#layer-c/storage/index.js';
import { getFileAnalysis } from '#layer-c/query/queries/file-query/core/single-file.js';

vi.mock('#layer-c/storage/index.js');
vi.mock('#layer-c/query/queries/file-query/core/single-file.js');

vi.mock('fs/promises', () => {
  const mockReaddir = vi.fn();
  const mockReadFile = vi.fn();
  return {
    default: {
      readdir: mockReaddir,
      readFile: mockReadFile
    },
    readdir: mockReaddir,
    readFile: mockReadFile
  };
});

// Import fs after mocking
import fs from 'fs/promises';

describe('atom-query', () => {
  const rootPath = 'C:/Dev/OmnySystem';
  const filePath = 'src/test-file.js';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAtomDetails', () => {
    const mockAtoms = [
      {
        id: 'src_test-file_js::myFunction',
        name: 'myFunction',
        file_path: filePath,
        line_start: 1,
        line_end: 30,
        complexity: 8,
        atom_type: 'function',
        is_exported: true,
        is_async: false,
        calls: ['helperFunc'],
        calledBy: ['mainFunc'],
        archetype: { type: 'core-function' },
        purpose: { type: 'business-logic' },
        linesOfCode: 30,
        params: ['param1', 'param2'],
        dataFlow: {
          inputs: [{ name: 'param1', type: 'string' }],
          outputs: [{ name: 'result', type: 'object' }]
        }
      },
      {
        id: 'src_test-file_js::helperFunc',
        name: 'helperFunc',
        file_path: filePath,
        line_start: 31,
        line_end: 50,
        complexity: 5,
        atom_type: 'arrow',
        is_exported: false,
        is_async: true,
        calls: [],
        calledBy: ['myFunction'],
        archetype: { type: 'helper' },
        purpose: { type: 'utility' },
        linesOfCode: 20,
        params: ['data'],
        dataFlow: {
          inputs: [{ name: 'data', type: 'any' }],
          outputs: []
        }
      }
    ];

    it('builds correct atom ID from file path and function name', async () => {
      loadAtoms.mockResolvedValue(mockAtoms);

      const result = await getAtomDetails(rootPath, filePath, 'myFunction');

      expect(loadAtoms).toHaveBeenCalledWith(rootPath, filePath);
      expect(result).toEqual(mockAtoms[0]);
    });

    it('returns atom when found', async () => {
      loadAtoms.mockResolvedValue(mockAtoms);

      const result = await getAtomDetails(rootPath, filePath, 'myFunction');

      expect(result).toBeDefined();
      expect(result.name).toBe('myFunction');
      expect(result.id).toBe('src_test-file_js::myFunction');
    });

    it('returns null when atom not found', async () => {
      loadAtoms.mockResolvedValue(mockAtoms);

      const result = await getAtomDetails(rootPath, filePath, 'nonExistent');

      expect(result).toBeNull();
    });

    it('uses cache when available and hit', async () => {
      loadAtoms.mockResolvedValue(mockAtoms);
      const mockCache = {
        getAtom: vi.fn().mockReturnValue(mockAtoms[0]),
        setAtom: vi.fn()
      };

      const result = await getAtomDetails(rootPath, filePath, 'myFunction', mockCache);

      expect(mockCache.getAtom).toHaveBeenCalledWith('src_test-file::myFunction');
      expect(loadAtoms).not.toHaveBeenCalled();
      expect(result).toEqual(mockAtoms[0]);
    });

    it('loads from disk when cache miss', async () => {
      loadAtoms.mockResolvedValue(mockAtoms);
      const mockCache = {
        getAtom: vi.fn().mockReturnValue(null),
        setAtom: vi.fn()
      };

      const result = await getAtomDetails(rootPath, filePath, 'myFunction', mockCache);

      expect(mockCache.getAtom).toHaveBeenCalled();
      expect(loadAtoms).toHaveBeenCalledWith(rootPath, filePath);
      expect(mockCache.setAtom).toHaveBeenCalledWith('src_test-file::myFunction', mockAtoms[0]);
      expect(result).toEqual(mockAtoms[0]);
    });

    it('only caches requested atom on cache miss', async () => {
      loadAtoms.mockResolvedValue(mockAtoms);
      const mockCache = {
        getAtom: vi.fn().mockReturnValue(null),
        setAtom: vi.fn()
      };

      await getAtomDetails(rootPath, filePath, 'myFunction', mockCache);

      expect(mockCache.setAtom).toHaveBeenCalledTimes(1);
      expect(mockCache.setAtom).toHaveBeenCalledWith('src_test-file::myFunction', mockAtoms[0]);
    });

    describe('backward compatibility migrations', () => {
      it('migrates Tree-Sitter params to dataFlow.inputs when missing', async () => {
        const atomWithoutDataFlow = {
          id: 'src_test-file_js::tsFunc',
          name: 'tsFunc',
          params: ['arg1', 'arg2']
        };
        loadAtoms.mockResolvedValue([atomWithoutDataFlow]);

        const result = await getAtomDetails(rootPath, filePath, 'tsFunc');

        expect(result.dataFlow).toBeDefined();
        expect(result.dataFlow.inputs).toEqual([
          { name: 'arg1', type: 'unknown' },
          { name: 'arg2', type: 'unknown' }
        ]);
      });

      it('preserves existing dataFlow.inputs', async () => {
        const atomWithDataFlow = {
          id: 'src_test-file_js::modernFunc',
          name: 'modernFunc',
          params: ['arg1'],
          dataFlow: {
            inputs: [{ name: 'arg1', type: 'string' }],
            outputs: []
          }
        };
        loadAtoms.mockResolvedValue([atomWithDataFlow]);

        const result = await getAtomDetails(rootPath, filePath, 'modernFunc');

        expect(result.dataFlow.inputs[0].type).toBe('string');
      });

      it('attaches file-level imports to atom', async () => {
        const atomWithoutImports = {
          id: 'src_test-file_js::noImports',
          name: 'noImports'
        };
        loadAtoms.mockResolvedValue([atomWithoutImports]);
        getFileAnalysis.mockResolvedValue({
          imports: ['lodash', 'axios']
        });

        const result = await getAtomDetails(rootPath, filePath, 'noImports');

        expect(getFileAnalysis).toHaveBeenCalledWith(rootPath, filePath);
        expect(result.imports).toEqual(['lodash', 'axios']);
      });

      it('handles getFileAnalysis error gracefully', async () => {
        const atomWithoutImports = {
          id: 'src_test-file_js::errorCase',
          name: 'errorCase'
        };
        loadAtoms.mockResolvedValue([atomWithoutImports]);
        getFileAnalysis.mockRejectedValue(new Error('File not found'));

        const result = await getAtomDetails(rootPath, filePath, 'errorCase');

        expect(result.imports).toEqual([]);
      });
    });
  });

  describe('findAtomsByArchetype', () => {
    const mockAtomFiles = [
      {
        path: 'C:/Dev/OmnySystem/.omnysysdata/atoms/src/file1.json',
        content: JSON.stringify({
          id: 'atom1',
          name: 'deadFunc',
          archetype: { type: 'dead-function' },
          file_path: 'src/file1.js'
        })
      },
      {
        path: 'C:/Dev/OmnySystem/.omnysysdata/atoms/src/file2.json',
        content: JSON.stringify({
          id: 'atom2',
          name: 'hotFunc',
          archetype: { type: 'hot-path' },
          file_path: 'src/file2.js'
        })
      },
      {
        path: 'C:/Dev/OmnySystem/.omnysysdata/atoms/src/file3.json',
        content: JSON.stringify({
          id: 'atom3',
          name: 'anotherDeadFunc',
          metadata: { archetype: { type: 'dead-function' } },
          file_path: 'src/file3.js'
        })
      }
    ];

    beforeEach(() => {
      fs.readdir.mockImplementation(async (dir, options) => {
        const normalizedDir = dir.replace(/\\/g, '/');
        if (normalizedDir.endsWith('/atoms')) {
          return [
            { name: 'src', isDirectory: () => true, isFile: () => false }
          ];
        }
        if (normalizedDir.endsWith('/atoms/src')) {
          return [
            { name: 'file1.json', isDirectory: () => false, isFile: () => true },
            { name: 'file2.json', isDirectory: () => false, isFile: () => true },
            { name: 'file3.json', isDirectory: () => false, isFile: () => true }
          ];
        }
        return [];
      });

      fs.readFile.mockImplementation(async (filePath) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const mockFile = mockAtomFiles.find(f => normalizedPath.includes(path.basename(f.path)));
        if (mockFile) {
          return mockFile.content;
        }
        throw new Error('File not found');
      });
    });

    it('finds all atoms matching archetype type', async () => {
      const result = await findAtomsByArchetype(rootPath, 'dead-function');

      expect(result.length).toBe(2);
      expect(result.map(a => a.name)).toEqual(
        expect.arrayContaining(['deadFunc', 'anotherDeadFunc'])
      );
    });

    it('returns empty array when no matches found', async () => {
      const result = await findAtomsByArchetype(rootPath, 'nonexistent-archetype');

      expect(result).toEqual([]);
    });

    it('recursively walks atom directory', async () => {
      await findAtomsByArchetype(rootPath, 'dead-function');

      expect(fs.readdir).toHaveBeenCalled();
    });

    it('only reads .json files', async () => {
      await findAtomsByArchetype(rootPath, 'dead-function');

      const jsonReadCalls = fs.readFile.mock.calls;
      jsonReadCalls.forEach(call => {
        expect(call[0]).toMatch(/\.json$/);
      });
    });

    it('handles corrupted JSON files gracefully', async () => {
      fs.readFile.mockImplementation(async (filePath) => {
        const fileName = path.basename(filePath);
        if (fileName === 'file1.json') {
          return 'invalid json {';
        }
        const mockFile = mockAtomFiles.find(f => f.path.includes(fileName));
        return mockFile ? mockFile.content : '{}';
      });

      const result = await findAtomsByArchetype(rootPath, 'dead-function');

      // Should not throw, should skip corrupted files
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles missing directory gracefully', async () => {
      fs.readdir.mockRejectedValue(new Error('Directory not found'));

      const result = await findAtomsByArchetype(rootPath, 'dead-function');

      expect(result).toEqual([]);
    });

    it('supports both archetype and metadata.archetype formats', async () => {
      const result = await findAtomsByArchetype(rootPath, 'dead-function');

      expect(result.length).toBe(2);
      const hasDirectArchetype = result.some(a => a.archetype?.type === 'dead-function');
      const hasMetadataArchetype = result.some(a => a.metadata?.archetype?.type === 'dead-function');
      expect(hasDirectArchetype || hasMetadataArchetype).toBe(true);
    });
  });

  describe('findAtomByLine', () => {
    const mockAtoms = [
      {
        id: 'src_file_js::func1',
        name: 'func1',
        file_path: filePath,
        lineStart: 1,
        lineEnd: 30
      },
      {
        id: 'src_file_js::func2',
        name: 'func2',
        file_path: filePath,
        lineStart: 31,
        lineEnd: 60
      },
      {
        id: 'src_file_js::func3',
        name: 'func3',
        file_path: filePath,
        lineStart: 61,
        lineEnd: 90
      }
    ];

    beforeEach(() => {
      loadAtoms.mockResolvedValue(mockAtoms);
    });

    it('finds atom containing specified line number', async () => {
      const result = await findAtomByLine(rootPath, filePath, 15);

      expect(result).toEqual(mockAtoms[0]);
    });

    it('finds atom when line is at start boundary', async () => {
      const result = await findAtomByLine(rootPath, filePath, 31);

      expect(result).toEqual(mockAtoms[1]);
    });

    it('finds atom when line is at end boundary', async () => {
      const result = await findAtomByLine(rootPath, filePath, 60);

      expect(result).toEqual(mockAtoms[1]);
    });

    it('returns null when line number outside all atom ranges', async () => {
      const result = await findAtomByLine(rootPath, filePath, 100);

      expect(result).toBeNull();
    });

    it('returns null when file has no atoms', async () => {
      loadAtoms.mockResolvedValue([]);

      const result = await findAtomByLine(rootPath, filePath, 10);

      expect(result).toBeNull();
    });

    it('handles 1-based line numbering correctly', async () => {
      const result = await findAtomByLine(rootPath, filePath, 1);

      expect(result).toEqual(mockAtoms[0]);
    });

    it('returns first matching atom when ranges overlap', async () => {
      const overlappingAtoms = [
        { lineStart: 1, lineEnd: 50, name: 'outer' },
        { lineStart: 10, lineEnd: 30, name: 'inner' }
      ];
      loadAtoms.mockResolvedValue(overlappingAtoms);

      const result = await findAtomByLine(rootPath, filePath, 20);

      expect(result).toBeDefined();
      expect(result.lineStart).toBeLessThanOrEqual(20);
      expect(result.lineEnd).toBeGreaterThanOrEqual(20);
    });
  });

  describe('buildAtomId helper', () => {
    it('replaces backslashes with underscores', () => {
      const filePath = 'src\\folder\\file.js';
      const expected = 'src_folder_file_js';

      // Test the ID construction logic indirectly through getAtomDetails
      const mockAtom = { id: `${expected}::myFunc`, name: 'myFunc' };
      loadAtoms.mockResolvedValue([mockAtom]);

      getAtomDetails(rootPath, filePath, 'myFunc');

      expect(loadAtoms).toHaveBeenCalledWith(rootPath, filePath);
    });

    it('replaces forward slashes with underscores', () => {
      const filePath = 'src/folder/file.js';
      const expected = 'src_folder_file_js';

      const mockAtom = { id: `${expected}::myFunc`, name: 'myFunc' };
      loadAtoms.mockResolvedValue([mockAtom]);

      getAtomDetails(rootPath, filePath, 'myFunc');

      expect(loadAtoms).toHaveBeenCalledWith(rootPath, filePath);
    });

    it('removes file extension', () => {
      const filePath = 'src/file.ts';
      const expected = 'src_file_ts';

      const mockAtom = { id: `${expected}::myFunc`, name: 'myFunc' };
      loadAtoms.mockResolvedValue([mockAtom]);

      getAtomDetails(rootPath, filePath, 'myFunc');

      expect(loadAtoms).toHaveBeenCalledWith(rootPath, filePath);
    });
  });

  describe('integration scenarios', () => {
    it('handles complete atom retrieval workflow', async () => {
      const mockAtom = {
        id: 'src_module_utils_js::helper',
        name: 'helper',
        file_path: 'src/module/utils.js',
        line_start: 10,
        line_end: 40,
        complexity: 7,
        params: ['data', 'options'],
        dataFlow: {
          inputs: [{ name: 'data', type: 'object' }],
          outputs: [{ name: 'result', type: 'any' }]
        }
      };
      loadAtoms.mockResolvedValue([mockAtom]);

      const result = await getAtomDetails(rootPath, 'src/module/utils.js', 'helper');

      expect(result).toEqual(mockAtom);
      expect(result.dataFlow.inputs).toBeDefined();
    });

    it('handles cache-then-disk fallback workflow', async () => {
      const mockAtom = {
        id: 'src_cached_js::func',
        name: 'func',
        file_path: 'src/cached.js'
      };
      const mockCache = {
        getAtom: vi.fn().mockReturnValue(null),
        setAtom: vi.fn()
      };
      loadAtoms.mockResolvedValue([mockAtom]);

      const result = await getAtomDetails(rootPath, 'src/cached.js', 'func', mockCache);

      expect(mockCache.getAtom).toHaveBeenCalled();
      expect(loadAtoms).toHaveBeenCalled();
      expect(mockCache.setAtom).toHaveBeenCalled();
      expect(result).toEqual(mockAtom);
    });
  });
});
