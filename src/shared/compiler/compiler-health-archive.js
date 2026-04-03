/**
 * @fileoverview Persistent daily archive for compiler health snapshots.
 *
 * Stored as a dedicated file inside .omnysysdata (health-history.db) so the
 * lifetime journal survives reindex/reanalyze cleanup of transient state.
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createLogger } from '#utils/logger.js';
import { asNumber } from './core-utils.js';
import { getCompilerHistoryDbPath, getCompilerHistoryDir } from './compiler-persistence-paths.js';
import { safeJsonStringify } from './safe-json.js';

const logger = createLogger('OmnySys:Compiler:HealthArchive');
const archiveConnections = new Map();

function normalizeKey(value) {
  return String(value || '').trim();
}

function normalizeCapturedDay(capturedAt = new Date().toISOString()) {
  return String(capturedAt || new Date().toISOString()).slice(0, 10);
}

function buildArchiveSchemaSql() {
  return `
    CREATE TABLE IF NOT EXISTS compiler_health_daily_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      snapshot_kind TEXT NOT NULL,
      scope_path TEXT,
      focus_path TEXT,
      scope_key TEXT NOT NULL,
      focus_key TEXT NOT NULL,
      captured_day TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      health_score REAL NOT NULL DEFAULT 0,
      health_grade TEXT,
      issue_count INTEGER NOT NULL DEFAULT 0,
      structural_groups INTEGER NOT NULL DEFAULT 0,
      conceptual_groups INTEGER NOT NULL DEFAULT 0,
      conceptual_raw_groups INTEGER NOT NULL DEFAULT 0,
      pipeline_orphans INTEGER NOT NULL DEFAULT 0,
      naming_targets INTEGER NOT NULL DEFAULT 0,
      live_coverage_ratio REAL NOT NULL DEFAULT 0,
      active_atoms INTEGER NOT NULL DEFAULT 0,
      watcher_alert_count INTEGER NOT NULL DEFAULT 0,
      recent_warning_count INTEGER NOT NULL DEFAULT 0,
      recent_error_count INTEGER NOT NULL DEFAULT 0,
      phase2_pending_files INTEGER NOT NULL DEFAULT 0,
      drift_state TEXT,
      drift_score REAL NOT NULL DEFAULT 0,
      stability_score REAL NOT NULL DEFAULT 0,
      success_score REAL NOT NULL DEFAULT 0,
      behavior_state TEXT,
      client_sync_state TEXT,
      client_sync_severity TEXT,
      summary_text TEXT,
      snapshot_fingerprint TEXT NOT NULL,
      payload_json TEXT,
      trend_json TEXT,
      UNIQUE(project_path, snapshot_kind, scope_key, focus_key, captured_day)
    );

    CREATE INDEX IF NOT EXISTS idx_health_archive_project_kind_day
      ON compiler_health_daily_snapshots(project_path, snapshot_kind, captured_day DESC);

    CREATE INDEX IF NOT EXISTS idx_health_archive_scope
      ON compiler_health_daily_snapshots(project_path, scope_key, focus_key);

    CREATE INDEX IF NOT EXISTS idx_health_archive_fingerprint
      ON compiler_health_daily_snapshots(snapshot_fingerprint);
  `;
}

function ensureArchiveDirectory(projectPath) {
  const archiveDir = getCompilerHistoryDir(projectPath);
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }
  return archiveDir;
}

function applyArchiveDbConfig(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = 16000');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('busy_timeout = 5000');
}

function ensureArchiveDb(projectPath) {
  const normalizedProjectPath = resolve(projectPath || process.cwd());
  const existing = archiveConnections.get(normalizedProjectPath);
  if (existing && existing.open !== false) {
    return existing;
  }

  const dbPath = getCompilerHistoryDbPath(normalizedProjectPath);
  ensureArchiveDirectory(normalizedProjectPath);
  const db = new Database(dbPath);
  applyArchiveDbConfig(db);
  db.exec(buildArchiveSchemaSql());
  archiveConnections.set(normalizedProjectPath, db);
  logger.debug(`[HealthArchive] Ready at: ${dbPath}`);
  return db;
}

function buildArchivePersistenceArgs(snapshot = null) {
  const current = snapshot?.current || {};
  return {
    project_path: snapshot?.projectPath || null,
    snapshot_kind: snapshot?.snapshotKind || 'status',
    scope_path: snapshot?.scopePath || null,
    focus_path: snapshot?.focusPath || null,
    scope_key: normalizeKey(snapshot?.scopePath || current.scopePath || ''),
    focus_key: normalizeKey(snapshot?.focusPath || current.focusPath || ''),
    captured_day: normalizeCapturedDay(current.capturedAt),
    captured_at: current.capturedAt || new Date().toISOString(),
    health_score: asNumber(current.healthScore, 0),
    health_grade: current.healthGrade || null,
    issue_count: asNumber(current.issueCount, 0),
    structural_groups: asNumber(current.structuralGroups, 0),
    conceptual_groups: asNumber(current.conceptualGroups, 0),
    conceptual_raw_groups: asNumber(current.conceptualRawGroups, 0),
    pipeline_orphans: asNumber(current.pipelineOrphans, 0),
    naming_targets: asNumber(current.namingTargets, 0),
    live_coverage_ratio: asNumber(current.liveCoverageRatio, 0),
    active_atoms: asNumber(current.activeAtoms, 0),
    watcher_alert_count: asNumber(current.watcherAlertCount, 0),
    recent_warning_count: asNumber(current.recentWarningCount, 0),
    recent_error_count: asNumber(current.recentErrorCount, 0),
    phase2_pending_files: asNumber(current.phase2PendingFiles, 0),
    drift_state: current.driftState || null,
    drift_score: asNumber(current.driftScore, 0),
    stability_score: asNumber(current.stabilityScore, 0),
    success_score: asNumber(current.successScore, 0),
    behavior_state: current.behaviorState || null,
    client_sync_state: current.clientSyncState || null,
    client_sync_severity: current.clientSyncSeverity || null,
    summary_text: snapshot?.summary || current.summaryText || null,
    snapshot_fingerprint: current.snapshotFingerprint || '',
    payload_json: safeJsonStringify({
      current,
      trend: snapshot?.trend || {},
      history: snapshot?.history || {},
      metricDictionary: snapshot?.metricDictionary || null,
      summary: snapshot?.summary || null
    }),
    trend_json: safeJsonStringify(snapshot?.trend || {})
  };
}

export function getCompilerHealthArchiveDb(projectPath = process.cwd()) {
  return ensureArchiveDb(projectPath);
}

export function closeCompilerHealthArchiveDb(projectPath = process.cwd()) {
  const normalizedProjectPath = resolve(projectPath || process.cwd());
  const db = archiveConnections.get(normalizedProjectPath);
  if (db?.open !== false) {
    db.close();
  }
  archiveConnections.delete(normalizedProjectPath);
}

export function shutdownCompilerHealthArchiveStorage() {
  for (const projectPath of archiveConnections.keys()) {
    closeCompilerHealthArchiveDb(projectPath);
  }
}

export function persistCompilerHealthArchiveSnapshot(projectPath, snapshot = null) {
  if (!projectPath || !snapshot) {
    return null;
  }

  const db = getCompilerHealthArchiveDb(projectPath);
  const stmt = db.prepare(`
    INSERT INTO compiler_health_daily_snapshots (
      project_path,
      snapshot_kind,
      scope_path,
      focus_path,
      scope_key,
      focus_key,
      captured_day,
      captured_at,
      health_score,
      health_grade,
      issue_count,
      structural_groups,
      conceptual_groups,
      conceptual_raw_groups,
      pipeline_orphans,
      naming_targets,
      live_coverage_ratio,
      active_atoms,
      watcher_alert_count,
      recent_warning_count,
      recent_error_count,
      phase2_pending_files,
      drift_state,
      drift_score,
      stability_score,
      success_score,
      behavior_state,
      client_sync_state,
      client_sync_severity,
      summary_text,
      snapshot_fingerprint,
      payload_json,
      trend_json
    ) VALUES (
      @project_path,
      @snapshot_kind,
      @scope_path,
      @focus_path,
      @scope_key,
      @focus_key,
      @captured_day,
      @captured_at,
      @health_score,
      @health_grade,
      @issue_count,
      @structural_groups,
      @conceptual_groups,
      @conceptual_raw_groups,
      @pipeline_orphans,
      @naming_targets,
      @live_coverage_ratio,
      @active_atoms,
      @watcher_alert_count,
      @recent_warning_count,
      @recent_error_count,
      @phase2_pending_files,
      @drift_state,
      @drift_score,
      @stability_score,
      @success_score,
      @behavior_state,
      @client_sync_state,
      @client_sync_severity,
      @summary_text,
      @snapshot_fingerprint,
      @payload_json,
      @trend_json
    )
    ON CONFLICT(project_path, snapshot_kind, scope_key, focus_key, captured_day)
    DO UPDATE SET
      scope_path = excluded.scope_path,
      focus_path = excluded.focus_path,
      captured_at = excluded.captured_at,
      health_score = excluded.health_score,
      health_grade = excluded.health_grade,
      issue_count = excluded.issue_count,
      structural_groups = excluded.structural_groups,
      conceptual_groups = excluded.conceptual_groups,
      conceptual_raw_groups = excluded.conceptual_raw_groups,
      pipeline_orphans = excluded.pipeline_orphans,
      naming_targets = excluded.naming_targets,
      live_coverage_ratio = excluded.live_coverage_ratio,
      active_atoms = excluded.active_atoms,
      watcher_alert_count = excluded.watcher_alert_count,
      recent_warning_count = excluded.recent_warning_count,
      recent_error_count = excluded.recent_error_count,
      phase2_pending_files = excluded.phase2_pending_files,
      drift_state = excluded.drift_state,
      drift_score = excluded.drift_score,
      stability_score = excluded.stability_score,
      success_score = excluded.success_score,
      behavior_state = excluded.behavior_state,
      client_sync_state = excluded.client_sync_state,
      client_sync_severity = excluded.client_sync_severity,
      summary_text = excluded.summary_text,
      snapshot_fingerprint = excluded.snapshot_fingerprint,
      payload_json = excluded.payload_json,
      trend_json = excluded.trend_json
  `);

  return stmt.run(buildArchivePersistenceArgs(snapshot));
}

function buildArchiveHistoryFilterSql({ projectPath, snapshotKind, scopePath, focusPath }) {
  return {
    sql: `
      SELECT
        captured_at,
        health_score,
        health_grade,
        issue_count,
        structural_groups,
        conceptual_groups,
        conceptual_raw_groups,
        pipeline_orphans,
        naming_targets,
        live_coverage_ratio,
        active_atoms,
        watcher_alert_count,
        recent_warning_count,
        recent_error_count,
        phase2_pending_files,
        drift_state,
        drift_score,
        stability_score,
        success_score,
        behavior_state,
        client_sync_state,
        summary_text,
        snapshot_fingerprint
      FROM compiler_health_daily_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND scope_key = ?
        AND focus_key = ?
      ORDER BY captured_at DESC
      LIMIT ?
    `,
    params: [
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath)
    ]
  };
}

export function loadCompilerHealthArchiveHistory(projectPath, options = {}) {
  if (!projectPath) {
    return { entries: [], latest: null, previous: null, baseline: null };
  }

  const db = getCompilerHealthArchiveDb(projectPath);
  if (!db?.prepare) {
    return { entries: [], latest: null, previous: null, baseline: null };
  }

  const {
    snapshotKind = 'status',
    scopePath = null,
    focusPath = null,
    limit = 12,
    compareDays = 3
  } = options;

  try {
    const filter = buildArchiveHistoryFilterSql({
      projectPath,
      snapshotKind,
      scopePath,
      focusPath
    });
    const rows = db.prepare(filter.sql).all(...filter.params, limit);
    const baselineCutoff = new Date(Date.now() - (compareDays * 24 * 60 * 60 * 1000)).toISOString();
    const baselineRow = db.prepare(`
      SELECT
        captured_at,
        health_score,
        health_grade,
        issue_count,
        structural_groups,
        conceptual_groups,
        conceptual_raw_groups,
        pipeline_orphans,
        naming_targets,
        live_coverage_ratio,
        active_atoms,
        watcher_alert_count,
        recent_warning_count,
        recent_error_count,
        phase2_pending_files,
        drift_state,
        drift_score,
        stability_score,
        success_score,
        behavior_state,
        client_sync_state,
        summary_text,
        snapshot_fingerprint
      FROM compiler_health_daily_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND scope_key = ?
        AND focus_key = ?
        AND captured_at <= ?
      ORDER BY captured_at DESC
      LIMIT 1
    `).get(projectPath, snapshotKind, normalizeKey(scopePath), normalizeKey(focusPath), baselineCutoff) || null;

    return {
      entries: rows,
      latest: rows[0] || null,
      previous: rows[1] || null,
      baseline: baselineRow
    };
  } catch (error) {
    logger.debug(`[HealthArchive] History load skipped: ${error.message}`);
    return { entries: [], latest: null, previous: null, baseline: null };
  }
}

export function loadCompilerHealthArchiveSummary(projectPath, options = {}) {
  if (!projectPath) {
    return null;
  }

  const db = getCompilerHealthArchiveDb(projectPath);
  if (!db?.prepare) {
    return null;
  }

  const {
    snapshotKind = 'status',
    scopePath = null,
    focusPath = null
  } = options;

  try {
    const row = db.prepare(`
      SELECT
        COUNT(*) AS totalSnapshots,
        COUNT(DISTINCT captured_day) AS totalDays,
        MIN(captured_at) AS firstCapturedAt,
        MAX(captured_at) AS lastCapturedAt,
        AVG(health_score) AS averageHealthScore,
        AVG(drift_score) AS averageDriftScore,
        AVG(stability_score) AS averageStabilityScore,
        AVG(success_score) AS averageSuccessScore,
        SUM(issue_count) AS totalIssueCount,
        SUM(recent_warning_count) AS totalWarningCount,
        SUM(recent_error_count) AS totalErrorCount,
        SUM(watcher_alert_count) AS totalWatcherAlertCount,
        SUM(CASE WHEN drift_state = 'blocked' THEN 1 ELSE 0 END) AS blockedDays,
        SUM(CASE WHEN drift_state = 'stale' THEN 1 ELSE 0 END) AS staleDays,
        SUM(CASE WHEN drift_state = 'reconciling' THEN 1 ELSE 0 END) AS reconcilingDays,
        SUM(CASE WHEN drift_state = 'watchful' THEN 1 ELSE 0 END) AS watchfulDays,
        SUM(CASE WHEN drift_state = 'fresh' THEN 1 ELSE 0 END) AS freshDays,
        MAX(health_score) AS bestHealthScore,
        MIN(health_score) AS worstHealthScore,
        MAX(CASE WHEN captured_at = (SELECT MAX(captured_at) FROM compiler_health_daily_snapshots WHERE project_path = ? AND snapshot_kind = ? AND scope_key = ? AND focus_key = ?) THEN health_score ELSE NULL END) AS latestHealthScore,
        MAX(CASE WHEN captured_at = (SELECT MAX(captured_at) FROM compiler_health_daily_snapshots WHERE project_path = ? AND snapshot_kind = ? AND scope_key = ? AND focus_key = ?) THEN health_grade ELSE NULL END) AS latestHealthGrade,
        MAX(CASE WHEN captured_at = (SELECT MAX(captured_at) FROM compiler_health_daily_snapshots WHERE project_path = ? AND snapshot_kind = ? AND scope_key = ? AND focus_key = ?) THEN behavior_state ELSE NULL END) AS latestBehaviorState,
        MAX(CASE WHEN captured_at = (SELECT MAX(captured_at) FROM compiler_health_daily_snapshots WHERE project_path = ? AND snapshot_kind = ? AND scope_key = ? AND focus_key = ?) THEN client_sync_state ELSE NULL END) AS latestClientSyncState
      FROM compiler_health_daily_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND scope_key = ?
        AND focus_key = ?
    `).get(
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath),
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath),
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath),
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath),
      projectPath,
      snapshotKind,
      normalizeKey(scopePath),
      normalizeKey(focusPath)
    );

    if (!row) {
      return null;
    }

    const daysObserved = asNumber(row.totalDays, 0);
    const snapshotsRecorded = asNumber(row.totalSnapshots, 0);
    const averageHealthScore = asNumber(row.averageHealthScore, 0);
    const averageDriftScore = asNumber(row.averageDriftScore, 0);
    const averageStabilityScore = asNumber(row.averageStabilityScore, 0);
    const averageSuccessScore = asNumber(row.averageSuccessScore, 0);

    return {
      projectPath,
      snapshotKind,
      scopePath: scopePath || null,
      focusPath: focusPath || null,
      daysObserved,
      snapshotsRecorded,
      firstCapturedAt: row.firstCapturedAt || null,
      lastCapturedAt: row.lastCapturedAt || null,
      averageHealthScore: Number(averageHealthScore.toFixed(2)),
      averageDriftScore: Number(averageDriftScore.toFixed(2)),
      averageStabilityScore: Number(averageStabilityScore.toFixed(2)),
      averageSuccessScore: Number(averageSuccessScore.toFixed(2)),
      totalIssueCount: asNumber(row.totalIssueCount, 0),
      totalWarningCount: asNumber(row.totalWarningCount, 0),
      totalErrorCount: asNumber(row.totalErrorCount, 0),
      totalWatcherAlertCount: asNumber(row.totalWatcherAlertCount, 0),
      blockedDays: asNumber(row.blockedDays, 0),
      staleDays: asNumber(row.staleDays, 0),
      reconcilingDays: asNumber(row.reconcilingDays, 0),
      watchfulDays: asNumber(row.watchfulDays, 0),
      freshDays: asNumber(row.freshDays, 0),
      bestHealthScore: asNumber(row.bestHealthScore, 0),
      worstHealthScore: asNumber(row.worstHealthScore, 0),
      latestHealthScore: asNumber(row.latestHealthScore, 0),
      latestHealthGrade: row.latestHealthGrade || null,
      latestBehaviorState: row.latestBehaviorState || null,
      latestClientSyncState: row.latestClientSyncState || null,
      summary: [
        `days=${daysObserved}`,
        `avgHealth=${Math.round(averageHealthScore)}`,
        `avgSuccess=${Math.round(averageSuccessScore)}`,
        `errors=${asNumber(row.totalErrorCount, 0)}`,
        `warnings=${asNumber(row.totalWarningCount, 0)}`
      ].join(' | ')
    };
  } catch (error) {
    logger.debug(`[HealthArchive] Summary load skipped: ${error.message}`);
    return null;
  }
}

export default {
  getCompilerHealthArchiveDb,
  closeCompilerHealthArchiveDb,
  shutdownCompilerHealthArchiveStorage,
  persistCompilerHealthArchiveSnapshot,
  loadCompilerHealthArchiveHistory,
  loadCompilerHealthArchiveSummary
};
