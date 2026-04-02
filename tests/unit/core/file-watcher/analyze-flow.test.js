import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseFileFromDisk: vi.fn(),
  analyzeFileCore: vi.fn(),
  calculateShadowVolume: vi.fn(),
  persistAnalysisArtifacts: vi.fn(),
  calculateContentHash: vi.fn(),
  buildFileResult: vi.fn(),
  saveFileResult: vi.fn(),
  guardRegistry: {
    initializeDefaultGuards: vi.fn(),
    runSemanticGuards: vi.fn()
  }
}));

vi.mock('../../../../src/layer-a-static/parser/index.js', () => ({
  parseFileFromDisk: mocks.parseFileFromDisk
}));

vi.mock('../../../../src/layer-a-static/pipeline/core-analyzer.js', () => ({
  analyzeFileCore: mocks.analyzeFileCore,
  calculateShadowVolume: mocks.calculateShadowVolume
}));

vi.mock('../../../../src/core/file-watcher/analyze-persistence.js', () => ({
  persistAnalysisArtifacts: mocks.persistAnalysisArtifacts
}));

vi.mock('../../../../src/layer-a-static/pipeline/single-file-db.js', () => ({
  saveFileResult: mocks.saveFileResult
}));

vi.mock('../../../../src/core/file-watcher/analyze-utils.js', () => ({
  _calculateContentHash: mocks.calculateContentHash,
  buildFileResult: mocks.buildFileResult
}));

vi.mock('/src/core/file-watcher/guards/registry.js?bust=1234', () => ({
  guardRegistry: mocks.guardRegistry
}));

import {
  collectAndBuildFileAnalysis,
  runFileWatcherSemanticGuards
} from '../../../../src/core/file-watcher/analyze-flow.js';

beforeEach(() => {
  mocks.parseFileFromDisk.mockReset();
  mocks.analyzeFileCore.mockReset();
  mocks.calculateShadowVolume.mockReset();
  mocks.persistAnalysisArtifacts.mockReset();
  mocks.calculateContentHash.mockReset();
  mocks.buildFileResult.mockReset();
  mocks.saveFileResult.mockReset();
  mocks.guardRegistry.initializeDefaultGuards.mockReset();
  mocks.guardRegistry.runSemanticGuards.mockReset();
});

describe('collectAndBuildFileAnalysis', () => {
  it('builds the file analysis result and persists the molecule atoms', async () => {
    const context = { rootPath: '/proj' };
    const parsed = {
      source: 'const value = 1;',
      imports: [{ source: './dep.js' }]
    };
    const metadata = {};
    const moleculeAtoms = [
      { id: 'src/file.js::value', lineStart: 1, lineEnd: 1 }
    ];

    mocks.parseFileFromDisk.mockResolvedValueOnce(parsed);
    mocks.analyzeFileCore.mockResolvedValueOnce({
      atoms: moleculeAtoms,
      metadata,
      parsed: {
        imports: parsed.imports
      }
    });
    mocks.calculateShadowVolume.mockReturnValueOnce({
      percentage: 33.33,
      unindexedLines: 2
    });
    mocks.persistAnalysisArtifacts.mockResolvedValueOnce(undefined);
    mocks.calculateContentHash.mockResolvedValueOnce('hash-123');
    mocks.buildFileResult.mockReturnValueOnce({
      filePath: 'src/file.js',
      metadata: { shadowVolume: 33.33 }
    });
    mocks.saveFileResult.mockResolvedValueOnce(undefined);

    const result = await collectAndBuildFileAnalysis(context, 'src/file.js', '/proj/src/file.js');

    expect(mocks.parseFileFromDisk).toHaveBeenCalledWith('/proj/src/file.js');
    expect(mocks.analyzeFileCore).toHaveBeenCalledWith('src/file.js', '/proj', {
      depth: 'deep',
      source: parsed.source
    });
    expect(mocks.calculateShadowVolume).toHaveBeenCalledWith(parsed.source, moleculeAtoms);
    expect(metadata).toMatchObject({
      shadowVolume: 33.33,
      unindexedLines: 2
    });
    expect(mocks.persistAnalysisArtifacts).toHaveBeenCalledWith('/proj', 'src/file.js', moleculeAtoms);
    expect(mocks.calculateContentHash).toHaveBeenCalledWith('/proj/src/file.js');
    expect(mocks.buildFileResult).toHaveBeenCalledWith(
      'src/file.js',
      parsed,
      parsed.imports,
      [],
      [],
      metadata,
      moleculeAtoms,
      'hash-123'
    );
    expect(mocks.saveFileResult).toHaveBeenCalledWith(
      '/proj',
      'src/file.js',
      {
        filePath: 'src/file.js',
        metadata: { shadowVolume: 33.33 },
        moleculeAtoms
      },
      'hash-123',
      null,
      false,
      false
    );
    expect(result).toEqual({
      filePath: 'src/file.js',
      metadata: { shadowVolume: 33.33 },
      moleculeAtoms
    });
  });

  it('throws when the file cannot be parsed', async () => {
    mocks.parseFileFromDisk.mockResolvedValueOnce(null);

    await expect(
      collectAndBuildFileAnalysis({ rootPath: '/proj' }, 'src/missing.js', '/proj/src/missing.js')
    ).rejects.toThrow('Failed to parse file');
  });

  it('propagates parser failures without swallowing them', async () => {
    mocks.parseFileFromDisk.mockRejectedValueOnce(new Error('parse failed'));

    await expect(
      collectAndBuildFileAnalysis({ rootPath: '/proj' }, 'src/missing.js', '/proj/src/missing.js')
    ).rejects.toThrow('parse failed');
  });
});

describe('runFileWatcherSemanticGuards', () => {
  it('short-circuits when no molecule atoms are present', async () => {
    await expect(runFileWatcherSemanticGuards({ rootPath: '/proj' }, 'src/file.js', [])).resolves.toBeUndefined();
    await expect(runFileWatcherSemanticGuards({ rootPath: '/proj' }, 'src/file.js', null)).resolves.toBeUndefined();

    expect(mocks.guardRegistry.initializeDefaultGuards).not.toHaveBeenCalled();
    expect(mocks.guardRegistry.runSemanticGuards).not.toHaveBeenCalled();
  });

  it('initializes and runs semantic guards when atoms exist', async () => {
    const atoms = [{ id: 'src/file.js::value' }];
    const context = { rootPath: '/proj' };
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234);

    await expect(
      runFileWatcherSemanticGuards(context, 'src/file.js', atoms)
    ).resolves.toBeUndefined();

    nowSpy.mockRestore();
  });
});
