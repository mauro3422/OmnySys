import { describe, expect, it, vi } from 'vitest';

const withCompilerRepositoryMock = vi.fn();

vi.mock('../../../../src/shared/compiler/compiler-persistence-paths.js', () => ({
  getCompilerDataDir: vi.fn(() => '/tmp/omnysys-compiler-data'),
  readPersistedMetadataJson: vi.fn(),
  withCompilerRepository: (...args) => withCompilerRepositoryMock(...args)
}));

describe('cleanupOrphanedCompilerArtifacts', () => {
  it('soft-deletes removed atoms in the live DB while preserving their metadata snapshot', async () => {
    const selectAll = vi.fn(() => [
      { id: 'src/file.js::removedFn', name: 'removedFn', purpose: 'ACTIVE' }
    ]);
    const runUpdate = vi.fn();
    const runRelations = vi.fn();
    const prepare = vi.fn((sql) => {
      if (sql.includes('SELECT id, name, purpose_type as purpose')) {
        return { all: selectAll };
      }
      if (sql.includes('UPDATE atoms')) {
        return { run: runUpdate };
      }
      if (sql.includes('UPDATE atom_relations')) {
        return { run: runRelations };
      }
      throw new Error(`Unexpected SQL in test: ${sql}`);
    });

    withCompilerRepositoryMock.mockImplementation(async (_rootPath, callback) => callback({
      db: { prepare }
    }));

    const { cleanupOrphanedCompilerArtifacts } = await import('../../../../src/shared/compiler/compiler-persistence-cleanup.js');
    const result = await cleanupOrphanedCompilerArtifacts('/repo', 'src/file.js', new Set(['keptFn']));

    expect(result.markedRemovedAtoms).toBe(1);
    expect(runUpdate).toHaveBeenCalledWith('src/file.js::removedFn');
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("SET purpose_type = 'REMOVED'"));
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('is_removed = 1'));
    expect(runRelations).toHaveBeenCalledWith('src/file.js::removedFn', 'src/file.js::removedFn');
  });

  it('maps removed atom snapshots to is_removed in SQLite rows', async () => {
    const { atomToRow } = await import('../../../../src/layer-c-memory/storage/repository/adapters/helpers/converters.js');

    const removedAtom = {
      id: 'src/file.js::fn',
      name: 'fn',
      purpose: 'REMOVED',
      isRemoved: true,
      isDeadCode: true
    };

    expect(atomToRow(removedAtom).is_removed).toBe(1);
  });
});
