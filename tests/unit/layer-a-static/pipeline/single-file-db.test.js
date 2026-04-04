import { describe, expect, it, vi } from 'vitest';

vi.mock('#layer-c/storage/repository/index.js', () => ({
  REPOSITORY_MUTATION_DURABILITY: { DURABLE: 'durable' },
  runRepositoryMutation: vi.fn(async (_root, mutation) => {
    const repo = {
      saveMany: vi.fn(),
      deleteByFile: vi.fn(),
      db: { open: true }
    };
    const result = await mutation.run(repo);
    return { queued: false, result };
  })
}));

vi.mock('#layer-c/storage/repository/repository-factory.js', () => ({
  getRepository: vi.fn(() => ({ initialized: false, db: { open: false } }))
}));

vi.mock('#layer-c/storage/repository/adapters/helpers/system-map-incremental.js', () => ({
  syncIncrementalSystemMapSurface: vi.fn(async () => ({
    skipped: false,
    sourcePath: 'src/example.js',
    dependenciesSaved: 0,
    systemFilesTouched: 0,
    usedByRecomputed: 0
  }))
}));

import { buildFileAnalysis, deriveModuleName } from '../../../../src/layer-a-static/pipeline/single-file-utils.js';
import { saveAtoms, saveFileResult } from '../../../../src/layer-a-static/pipeline/single-file-db.js';

describe('single-file persistence guards', () => {
  it('buildFileAnalysis tolerates missing arrays and normalizes empty values', () => {
    const analysis = buildFileAnalysis(
      'src/example.js',
      { exports: undefined, definitions: undefined },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );

    expect(analysis).toMatchObject({
      filePath: 'src/example.js',
      fileName: 'example.js',
      moduleName: deriveModuleName('src/example.js'),
      imports: [],
      exports: [],
      definitions: [],
      semanticConnections: [],
      totalAtoms: 0,
      atoms: []
    });
  });

  it('saveAtoms tolerates undefined atoms without throwing', async () => {
    await expect(saveAtoms('C:/root', 'src/example.js', undefined)).resolves.toBeUndefined();
  });

  it('saveFileResult tolerates missing fileAnalysis arrays and still calls the system map sync', async () => {
    await expect(
      saveFileResult('C:/root', 'src/example.js', undefined, 'hash', null, true, false)
    ).resolves.toBe('src/example.js');
  });
});
