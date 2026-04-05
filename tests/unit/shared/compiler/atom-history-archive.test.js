import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  closeAtomHistoryArchiveDb,
  loadAtomVersionArchiveHistory,
  persistAtomVersionArchiveBatch,
  persistAtomVersionArchiveSnapshot,
  shutdownAtomHistoryArchiveStorage
} from '../../../../src/shared/compiler/atom-history-archive.js';
import { getAtomHistoryDbPath } from '../../../../src/shared/compiler/compiler-persistence-paths.js';

const projectRoots = [];

afterEach(() => {
  shutdownAtomHistoryArchiveStorage();
  while (projectRoots.length > 0) {
    rmSync(projectRoots.pop(), { recursive: true, force: true });
  }
});

describe('atom history archive', () => {
  it('persists atom evolution outside the operational DB and survives cleanup', () => {
    const projectPath = mkdtempSync(join(tmpdir(), 'omnysys-atom-history-'));
    projectRoots.push(projectPath);

    const mainDbDir = join(projectPath, '.omnysysdata');
    mkdirSync(mainDbDir, { recursive: true });
    writeFileSync(join(mainDbDir, 'omnysys.db'), 'main-db-placeholder');

    const atomId = 'src/shared/compiler/sample.js::sample';
    const atomData = {
      name: 'sample',
      filePath: 'src/shared/compiler/sample.js',
      type: 'function',
      complexity: 3,
      dataFlow: { inputs: ['foo'], outputs: ['bar'] },
      dna: { structuralHash: 'abc123' }
    };

    persistAtomVersionArchiveSnapshot(projectPath, atomId, atomData, {
      hash: 'hash-1',
      fieldHashes: { name: 'n1' },
      lastModified: 1700000000000,
      filePath: atomData.filePath,
      atomName: atomData.name
    }, { source: 'test', capturedAt: '2026-01-01T08:00:00.000Z' });

    persistAtomVersionArchiveBatch(projectPath, [
      {
        atomId,
        atomData: { ...atomData, complexity: 4 },
        version: {
          hash: 'hash-2',
          fieldHashes: { complexity: 'c2' },
          lastModified: 1700000000100,
          filePath: atomData.filePath,
          atomName: atomData.name
        },
        capturedAt: '2026-01-02T08:00:00.000Z',
        source: 'test-batch'
      }
    ]);

    rmSync(join(mainDbDir, 'omnysys.db'), { force: true });
    rmSync(join(mainDbDir, 'omnysys.db-wal'), { force: true });
    rmSync(join(mainDbDir, 'omnysys.db-shm'), { force: true });
    rmSync(join(mainDbDir, 'index.json'), { force: true });
    rmSync(join(mainDbDir, 'atom-versions.json'), { force: true });

    closeAtomHistoryArchiveDb(projectPath);

    const history = loadAtomVersionArchiveHistory(projectPath, {
      atomId,
      filePath: atomData.filePath,
      limit: 10
    });

    expect(getAtomHistoryDbPath(projectPath)).toContain('atom-history.db');
    expect(existsSync(getAtomHistoryDbPath(projectPath))).toBe(true);
    expect(history).toHaveLength(2);
    expect(history[0].atom_id).toBe(atomId);
    expect(history[0].file_path).toBe(atomData.filePath);
    expect(history[0].version_hash).toBe('hash-2');
    expect(JSON.parse(history[0].payload_json).atom.name).toBe('sample');
  });
});
