import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { existsSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { getCompilerHistoryDbPath } from '../../../../src/shared/compiler/compiler-persistence-paths.js';
import {
  persistCompilerMetricsSnapshot
} from '../../../../src/shared/compiler/metrics/index.js';
import {
  loadCompilerHealthArchiveHistory,
  loadCompilerHealthArchiveSummary,
  persistCompilerHealthArchiveSnapshot,
  shutdownCompilerHealthArchiveStorage
} from '../../../../src/shared/compiler/compiler-health-archive.js';

const tempRoots = [];

function createMainMetricsDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE compiler_metrics_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      snapshot_kind TEXT NOT NULL,
      scope_path TEXT,
      focus_path TEXT,
      capture_source TEXT,
      analysis_generation_id TEXT,
      captured_at TEXT NOT NULL,
      health_score REAL NOT NULL DEFAULT 0,
      health_grade TEXT,
      issue_count INTEGER NOT NULL DEFAULT 0,
      structural_groups INTEGER NOT NULL DEFAULT 0,
      conceptual_groups INTEGER NOT NULL DEFAULT 0,
      conceptual_raw_groups INTEGER NOT NULL DEFAULT 0,
      pipeline_orphans INTEGER NOT NULL DEFAULT 0,
      folderization_candidate_count INTEGER NOT NULL DEFAULT 0,
      flat_families INTEGER NOT NULL DEFAULT 0,
      mixed_families INTEGER NOT NULL DEFAULT 0,
      already_folderized_families INTEGER NOT NULL DEFAULT 0,
      naming_families INTEGER NOT NULL DEFAULT 0,
      naming_targets INTEGER NOT NULL DEFAULT 0,
      naming_debt INTEGER NOT NULL DEFAULT 0,
      live_coverage_ratio REAL NOT NULL DEFAULT 0,
      active_atoms INTEGER NOT NULL DEFAULT 0,
      zero_atom_file_count INTEGER NOT NULL DEFAULT 0,
      call_links INTEGER NOT NULL DEFAULT 0,
      semantic_links INTEGER NOT NULL DEFAULT 0,
      watcher_alert_count INTEGER NOT NULL DEFAULT 0,
      recent_warning_count INTEGER NOT NULL DEFAULT 0,
      recent_error_count INTEGER NOT NULL DEFAULT 0,
      phase2_pending_files INTEGER NOT NULL DEFAULT 0,
      drift_state TEXT,
      drift_score REAL NOT NULL DEFAULT 0,
      stability_score REAL NOT NULL DEFAULT 0,
      success_score REAL NOT NULL DEFAULT 0,
      success_threshold REAL NOT NULL DEFAULT 0,
      mvp_ready INTEGER NOT NULL DEFAULT 0,
      behavior_state TEXT,
      readiness_reason TEXT,
      snapshot_fingerprint TEXT NOT NULL,
      summary_text TEXT,
      payload_json TEXT,
      trend_json TEXT
    );
  `);
  return db;
}

function buildSnapshot({ capturedAt, healthScore, summaryText, projectPath, snapshotKind = 'status', scopePath = 'src', focusPath = 'src/file.js' }) {
  return {
    projectPath,
    snapshotKind,
    scopePath,
    focusPath,
    current: {
      capturedAt,
      healthScore,
      healthGrade: healthScore >= 97 ? 'A+' : 'A',
      issueCount: Math.max(0, 100 - healthScore),
      structuralGroups: 1,
      conceptualGroups: 0,
      conceptualRawGroups: 0,
      pipelineOrphans: 0,
      folderizationCandidateCount: 0,
      flatFamilies: 0,
      mixedFamilies: 0,
      alreadyFolderizedFamilies: 0,
      namingFamilies: 0,
      namingTargets: 0,
      namingDebt: 0,
      liveCoverageRatio: 1,
      activeAtoms: 120,
      zeroAtomFileCount: 0,
      callLinks: 10,
      semanticLinks: 2,
      watcherAlertCount: 0,
      recentWarningCount: 0,
      recentErrorCount: 0,
      phase2PendingFiles: 0,
      driftState: 'fresh',
      driftScore: 0,
      stabilityScore: 100,
      successScore: 100,
      successThreshold: 85,
      mvpReady: true,
      behaviorState: 'ready',
      readinessReason: 'ready',
      snapshotFingerprint: `${snapshotKind}-${capturedAt}`,
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
  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('compiler-metrics-snapshot-helpers', () => {
  it('compacts intraday main snapshots while preserving the daily archive history', () => {
    const projectPath = mkdtempSync(join(tmpdir(), 'omnysys-metrics-archive-'));
    tempRoots.push(projectPath);

    mkdirSync(join(projectPath, '.omnysysdata'), { recursive: true });

    const db = createMainMetricsDb();

    const dayOneMorning = buildSnapshot({
      projectPath,
      capturedAt: '2026-04-01T08:00:00.000Z',
      healthScore: 90,
      summaryText: 'day one morning'
    });
    const dayOneNoon = buildSnapshot({
      projectPath,
      capturedAt: '2026-04-01T12:00:00.000Z',
      healthScore: 92,
      summaryText: 'day one noon'
    });
    const dayOneNight = buildSnapshot({
      projectPath,
      capturedAt: '2026-04-01T20:00:00.000Z',
      healthScore: 94,
      summaryText: 'day one night'
    });
    const dayTwo = buildSnapshot({
      projectPath,
      capturedAt: '2026-04-02T09:00:00.000Z',
      healthScore: 97,
      summaryText: 'day two'
    });

    const firstResult = persistCompilerMetricsSnapshot(db, dayOneMorning);
    const secondResult = persistCompilerMetricsSnapshot(db, dayOneNoon);
    const thirdResult = persistCompilerMetricsSnapshot(db, dayOneNight);
    const fourthResult = persistCompilerMetricsSnapshot(db, dayTwo);

    persistCompilerHealthArchiveSnapshot(projectPath, dayOneMorning);
    persistCompilerHealthArchiveSnapshot(projectPath, dayOneNoon);
    persistCompilerHealthArchiveSnapshot(projectPath, dayOneNight);
    persistCompilerHealthArchiveSnapshot(projectPath, dayTwo);

    const mainRows = db.prepare(`
      SELECT captured_at, health_score, summary_text
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_path, '') = IFNULL(?, '')
        AND IFNULL(focus_path, '') = IFNULL(?, '')
      ORDER BY captured_at ASC
    `).all(projectPath, 'status', 'src', 'src/file.js');

    const archiveHistory = loadCompilerHealthArchiveHistory(projectPath, {
      snapshotKind: 'status',
      scopePath: 'src',
      focusPath: 'src/file.js',
      limit: 10,
      compareDays: 3
    });
    const archiveSummary = loadCompilerHealthArchiveSummary(projectPath, {
      snapshotKind: 'status',
      scopePath: 'src',
      focusPath: 'src/file.js'
    });

    expect(firstResult.archive.deleted).toBe(0);
    expect(secondResult.archive.deleted).toBe(1);
    expect(thirdResult.archive.deleted).toBe(1);
    expect(fourthResult.archive.deleted).toBe(0);
    expect(mainRows).toHaveLength(2);
    expect(mainRows.map((row) => row.captured_at)).toEqual([
      '2026-04-01T20:00:00.000Z',
      '2026-04-02T09:00:00.000Z'
    ]);
    expect(mainRows.map((row) => row.summary_text)).toEqual([
      'day one night',
      'day two'
    ]);
    expect(archiveHistory.entries).toHaveLength(2);
    expect(archiveHistory.latest?.captured_at).toBe('2026-04-02T09:00:00.000Z');
    expect(archiveHistory.previous?.captured_at).toBe('2026-04-01T20:00:00.000Z');
    expect(archiveSummary?.daysObserved).toBe(2);
    expect(archiveSummary?.snapshotsRecorded).toBe(2);
    expect(existsSync(getCompilerHistoryDbPath(projectPath))).toBe(true);
  });
});
