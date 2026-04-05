import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildCompilerHistoricalStorageSummary } from '../../../../src/shared/compiler/compiler-persistence-paths.js';

describe('compiler persistence paths', () => {
  const tempRoots = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const tempRoot = tempRoots.pop();
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('summarizes historical storage readiness', () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'omnysys-history-'));
    tempRoots.push(tempRoot);
    const archiveDir = path.join(tempRoot, '.omnysysdata');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(path.join(archiveDir, 'health-history.db'), 'health-history');
    writeFileSync(path.join(archiveDir, 'atom-history.db'), 'atom-history');

    const summary = buildCompilerHistoricalStorageSummary(tempRoot);

    expect(summary.projectPath).toBe(path.resolve(tempRoot));
    expect(summary.archiveDir).toBe(path.join(path.resolve(tempRoot), '.omnysysdata'));
    expect(summary.totalStores).toBe(2);
    expect(summary.readyStoreCount).toBe(2);
    expect(summary.missingStoreCount).toBe(0);
    expect(summary.state).toBe('ready');
    expect(summary.summaryText).toContain('health=ready');
    expect(summary.summaryText).toContain('atom=ready');
    expect(summary.summaryText).toContain('ready=2/2');
    expect(summary.stores).toHaveLength(2);
    expect(summary.stores[0]).toMatchObject({
      label: 'health-history.db',
      exists: true,
      state: 'ready'
    });
    expect(summary.stores[1]).toMatchObject({
      label: 'atom-history.db',
      exists: true,
      state: 'ready'
    });
  });
});
