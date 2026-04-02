import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { getCompilerHistoryDbPath } from '../../../../src/shared/compiler/compiler-persistence-paths.js';
import {
  loadCompilerHealthArchiveHistory,
  loadCompilerHealthArchiveSummary,
  persistCompilerHealthArchiveSnapshot,
  shutdownCompilerHealthArchiveStorage
} from '../../../../src/shared/compiler/compiler-health-archive.js';

const projectRoots = [];

function buildSnapshot(projectPath, capturedAt, healthScore, summaryText) {
  return {
    projectPath,
    snapshotKind: 'status',
    scopePath: null,
    focusPath: null,
    current: {
      capturedAt,
      healthScore,
      healthGrade: healthScore >= 97 ? 'A+' : healthScore >= 93 ? 'A' : 'B',
      issueCount: 10 - Math.round(healthScore / 10),
      structuralGroups: 1,
      conceptualGroups: 0,
      conceptualRawGroups: 0,
      pipelineOrphans: 0,
      namingTargets: 2,
      liveCoverageRatio: 0.98,
      activeAtoms: 100,
      watcherAlertCount: 0,
      recentWarningCount: 0,
      recentErrorCount: 0,
      phase2PendingFiles: 0,
      driftState: 'fresh',
      driftScore: healthScore,
      stabilityScore: healthScore,
      successScore: healthScore,
      behaviorState: 'ready',
      clientSyncState: 'fresh',
      clientSyncSeverity: 'low',
      snapshotFingerprint: `${healthScore}-${capturedAt}`,
      summaryText
    },
    trend: {
      status: 'stable',
      summary: summaryText
    },
    history: {},
    metricDictionary: null,
    summary: summaryText
  };
}

afterEach(() => {
  shutdownCompilerHealthArchiveStorage();
  while (projectRoots.length > 0) {
    rmSync(projectRoots.pop(), { recursive: true, force: true });
  }
});

describe('compiler health archive', () => {
  it('persists daily history inside .omnysysdata and survives main-db cleanup', () => {
    const projectPath = mkdtempSync(join(tmpdir(), 'omnysys-health-archive-'));
    projectRoots.push(projectPath);

    const mainDbDir = join(projectPath, '.omnysysdata');
    mkdirSync(mainDbDir, { recursive: true });
    writeFileSync(join(mainDbDir, 'omnysys.db'), 'main-db-placeholder');

    const dayOne = buildSnapshot(
      projectPath,
      '2026-01-01T08:00:00.000Z',
      90,
      'day one'
    );
    const dayTwo = buildSnapshot(
      projectPath,
      '2026-01-02T08:00:00.000Z',
      95,
      'day two'
    );

    persistCompilerHealthArchiveSnapshot(projectPath, dayOne);
    persistCompilerHealthArchiveSnapshot(projectPath, dayTwo);

    rmSync(join(mainDbDir, 'omnysys.db'), { force: true });
    rmSync(join(mainDbDir, 'omnysys.db-wal'), { force: true });
    rmSync(join(mainDbDir, 'omnysys.db-shm'), { force: true });
    rmSync(join(mainDbDir, 'index.json'), { force: true });
    rmSync(join(mainDbDir, 'atom-versions.json'), { force: true });

    const history = loadCompilerHealthArchiveHistory(projectPath, {
      snapshotKind: 'status',
      limit: 10,
      compareDays: 3
    });
    const summary = loadCompilerHealthArchiveSummary(projectPath, {
      snapshotKind: 'status'
    });

    expect(getCompilerHistoryDbPath(projectPath)).toContain('.omnysysdata');
    expect(existsSync(getCompilerHistoryDbPath(projectPath))).toBe(true);
    expect(history.entries).toHaveLength(2);
    expect(history.latest?.captured_at).toBe('2026-01-02T08:00:00.000Z');
    expect(history.previous?.captured_at).toBe('2026-01-01T08:00:00.000Z');
    expect(summary?.daysObserved).toBe(2);
    expect(summary?.snapshotsRecorded).toBe(2);
    expect(summary?.averageHealthScore).toBe(92.5);
    expect(summary?.latestHealthScore).toBe(95);
  });
});
