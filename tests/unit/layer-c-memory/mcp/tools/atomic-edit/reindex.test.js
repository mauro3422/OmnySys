import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'path';

const h = vi.hoisted(() => ({
  saveAtomsIncremental: vi.fn(async () => undefined),
  parseFileFromDisk: vi.fn(),
  extractMetadataSurface: vi.fn(),
  extractAtoms: vi.fn(),
  resolveFileImports: vi.fn(),
  buildFileAnalysis: vi.fn(),
  saveFileResult: vi.fn(async () => undefined),
  calculateContentHash: vi.fn(() => 'hash-123'),
  invalidateCacheInstance: vi.fn(async () => undefined)
}));

vi.mock('#layer-c/storage/atoms/incremental-atom-saver.js', () => ({
  saveAtomsIncremental: h.saveAtomsIncremental
}));

vi.mock('#layer-a/parser/index.js', () => ({
  parseFileFromDisk: h.parseFileFromDisk
}));

vi.mock('#layer-a/pipeline/metadata-gateway.js', () => ({
  extractMetadataSurface: h.extractMetadataSurface
}));

vi.mock('#layer-a/pipeline/phases/atom-extraction/extraction/atom-extractor.js', () => ({
  extractAtoms: h.extractAtoms
}));

vi.mock('#layer-a/pipeline/single-file-utils.js', () => ({
  resolveFileImports: h.resolveFileImports,
  buildFileAnalysis: h.buildFileAnalysis
}));

vi.mock('#layer-a/pipeline/single-file-db.js', () => ({
  saveFileResult: h.saveFileResult
}));

vi.mock('#layer-a/pipeline/incremental-analysis-utils.js', () => ({
  calculateContentHash: h.calculateContentHash
}));

vi.mock('#core/cache/index.js', () => ({
  invalidateCacheInstance: h.invalidateCacheInstance
}));

import { reindexFile } from '../../../../../../src/layer-c-memory/mcp/tools/atomic-edit/reindex.js';

beforeEach(() => {
  h.saveAtomsIncremental.mockClear();
  h.parseFileFromDisk.mockClear();
  h.extractMetadataSurface.mockClear();
  h.extractAtoms.mockClear();
  h.resolveFileImports.mockClear();
  h.buildFileAnalysis.mockClear();
  h.saveFileResult.mockClear();
  h.calculateContentHash.mockClear();
  h.invalidateCacheInstance.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('reindexFile', () => {
  it('refreshes the file summary so files.imports_json stays aligned with the parser', async () => {
    const projectPath = 'C:/Dev/OmnySystem';
    const filePath = 'src/shared/utils/stats-pool.js';
    const absolutePath = path.join(projectPath, filePath);
    const parsedFile = {
      source: "import { createLogger } from '#utils/logger.js';\nexport const statsPool = {};",
      imports: [
        {
          source: '#utils/logger.js',
          specifiers: [
            {
              local: 'createLogger',
              imported: 'createLogger'
            }
          ]
        }
      ],
      exports: [
        {
          name: 'statsPool'
        }
      ]
    };
    const metadata = { jsdoc: {}, async: {}, errors: {}, build: {} };
    const atoms = [
      {
        id: `${filePath}::statsPool`,
        name: 'statsPool'
      }
    ];

    h.parseFileFromDisk.mockResolvedValue(parsedFile);
    h.extractMetadataSurface.mockResolvedValue(metadata);
    h.extractAtoms.mockResolvedValue(atoms);
    h.resolveFileImports.mockResolvedValue([
      {
        source: '#utils/logger.js',
        resolved: 'src/layer-c-memory/utils/logger.js',
        type: 'esm',
        specifiers: parsedFile.imports[0].specifiers
      }
    ]);
    h.buildFileAnalysis.mockImplementation((relativePath, fileInfo, resolvedImports, staticConnections, advancedConnections, fileMetadata, fileAtoms) => ({
      filePath: relativePath,
      imports: resolvedImports.map((entry) => ({
        source: entry.source,
        resolvedPath: entry.resolved,
        type: entry.type,
        specifiers: entry.specifiers
      })),
      exports: fileInfo.exports || [],
      moduleName: 'shared',
      totalAtoms: fileAtoms.length,
      totalLines: fileInfo.source.split(/\r?\n/).length,
      metadata: fileMetadata,
      semanticConnections: [...staticConnections.all, ...advancedConnections.all]
    }));

    const result = await reindexFile(filePath, projectPath);

    expect(result.success).toBe(true);
    expect(h.resolveFileImports).toHaveBeenCalledWith(parsedFile, absolutePath, projectPath);
    expect(h.buildFileAnalysis).toHaveBeenCalledTimes(1);
    expect(h.saveFileResult).toHaveBeenCalledTimes(1);
    expect(h.saveFileResult).toHaveBeenCalledWith(
      projectPath,
      filePath,
      expect.objectContaining({
        imports: [
          {
            source: '#utils/logger.js',
            resolvedPath: 'src/layer-c-memory/utils/logger.js',
            type: 'esm',
            specifiers: parsedFile.imports[0].specifiers
          }
        ],
        exports: parsedFile.exports,
        moduleName: 'shared',
        totalAtoms: atoms.length,
        totalLines: 2
      }),
      'hash-123',
      null,
      false,
      false
    );
    expect(h.invalidateCacheInstance).toHaveBeenCalledWith(projectPath);
  });
});
