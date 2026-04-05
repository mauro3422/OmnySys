/**
 * @fileoverview Persistent archive for atom version evolution.
 *
 * Stores immutable history outside the operational SQLite DB so the evolution
 * of atoms survives reanalyze / destructive cache cleanup.
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createLogger } from '#utils/logger.js';
import { safeJsonStringify } from './safe-json.js';
import { getAtomHistoryDbPath, getCompilerHistoryDir } from './compiler-persistence-paths.js';

const logger = createLogger('OmnySys:AtomHistoryArchive');
const archiveConnections = new Map();

function normalizeKey(value) {
  return String(value || '').trim();
}

function normalizeCapturedDay(capturedAt = new Date().toISOString()) {
  return String(capturedAt || new Date().toISOString()).slice(0, 10);
}

function buildArchiveSchemaSql() {
  return `
    CREATE TABLE IF NOT EXISTS atom_versions_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      atom_id TEXT NOT NULL,
      atom_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      version_hash TEXT NOT NULL,
      field_hashes_json TEXT NOT NULL,
      last_modified INTEGER NOT NULL,
      captured_at TEXT NOT NULL,
      captured_day TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'incremental',
      version_fingerprint TEXT NOT NULL,
      payload_json TEXT,
      UNIQUE(version_fingerprint)
    );

    CREATE INDEX IF NOT EXISTS idx_atom_versions_archive_project_atom_time
      ON atom_versions_archive(project_path, atom_id, captured_at DESC);

    CREATE INDEX IF NOT EXISTS idx_atom_versions_archive_project_file
      ON atom_versions_archive(project_path, file_path);

    CREATE INDEX IF NOT EXISTS idx_atom_versions_archive_fingerprint
      ON atom_versions_archive(version_fingerprint);
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
  db.pragma('cache_size = 12000');
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

  const dbPath = getAtomHistoryDbPath(normalizedProjectPath);
  ensureArchiveDirectory(normalizedProjectPath);
  const db = new Database(dbPath);
  applyArchiveDbConfig(db);
  db.exec(buildArchiveSchemaSql());
  archiveConnections.set(normalizedProjectPath, db);
  logger.debug(`[AtomHistoryArchive] Ready at: ${dbPath}`);
  return db;
}

function buildFingerprint({
  projectPath = '',
  atomId = '',
  versionHash = '',
  lastModified = '',
  filePath = '',
  atomName = '',
  source = ''
} = {}) {
  return [
    normalizeKey(projectPath),
    normalizeKey(atomId),
    normalizeKey(versionHash),
    normalizeKey(lastModified),
    normalizeKey(filePath),
    normalizeKey(atomName),
    normalizeKey(source)
  ].join('::');
}

function buildArchiveRow(projectPath, atomId, atomData = {}, version = {}, options = {}) {
  const capturedAt = options.capturedAt || new Date().toISOString();
  const filePath = version.filePath || atomData.filePath || atomData.file || '';
  const atomName = version.atomName || atomData.name || '';
  const versionHash = version.hash || '';
  const lastModified = Number.isFinite(version.lastModified) ? version.lastModified : Date.now();
  const fieldHashes = version.fieldHashes || {};
  const source = options.source || 'incremental';

  return {
    project_path: projectPath,
    atom_id: atomId,
    atom_name: atomName,
    file_path: filePath,
    version_hash: versionHash,
    field_hashes_json: safeJsonStringify(fieldHashes || {}),
    last_modified: lastModified,
    captured_at: capturedAt,
    captured_day: normalizeCapturedDay(capturedAt),
    source,
    version_fingerprint: buildFingerprint({
      projectPath,
      atomId,
      versionHash,
      lastModified,
      filePath,
      atomName,
      source
    }),
    payload_json: safeJsonStringify({
      atom: atomData,
      version,
      source,
      projectPath,
      atomId
    })
  };
}

export function getAtomHistoryArchiveDb(projectPath = process.cwd()) {
  return ensureArchiveDb(projectPath);
}

export function closeAtomHistoryArchiveDb(projectPath = process.cwd()) {
  const normalizedProjectPath = resolve(projectPath || process.cwd());
  const db = archiveConnections.get(normalizedProjectPath);
  if (db?.open !== false) {
    db.close();
  }
  archiveConnections.delete(normalizedProjectPath);
}

export function shutdownAtomHistoryArchiveStorage() {
  for (const projectPath of archiveConnections.keys()) {
    closeAtomHistoryArchiveDb(projectPath);
  }
}

export function persistAtomVersionArchiveSnapshot(projectPath, atomId, atomData = {}, version = {}, options = {}) {
  if (!projectPath || !atomId) {
    return null;
  }

  const db = getAtomHistoryArchiveDb(projectPath);
  const row = buildArchiveRow(projectPath, atomId, atomData, version, options);
  const stmt = db.prepare(`
    INSERT INTO atom_versions_archive (
      project_path,
      atom_id,
      atom_name,
      file_path,
      version_hash,
      field_hashes_json,
      last_modified,
      captured_at,
      captured_day,
      source,
      version_fingerprint,
      payload_json
    ) VALUES (
      @project_path,
      @atom_id,
      @atom_name,
      @file_path,
      @version_hash,
      @field_hashes_json,
      @last_modified,
      @captured_at,
      @captured_day,
      @source,
      @version_fingerprint,
      @payload_json
    )
    ON CONFLICT(version_fingerprint) DO UPDATE SET
      payload_json = excluded.payload_json
  `);

  return stmt.run(row);
}

export function persistAtomVersionArchiveBatch(projectPath, entries = [], options = {}) {
  if (!projectPath || !Array.isArray(entries) || entries.length === 0) {
    return { changes: 0 };
  }

  const db = getAtomHistoryArchiveDb(projectPath);
  const stmt = db.prepare(`
    INSERT INTO atom_versions_archive (
      project_path,
      atom_id,
      atom_name,
      file_path,
      version_hash,
      field_hashes_json,
      last_modified,
      captured_at,
      captured_day,
      source,
      version_fingerprint,
      payload_json
    ) VALUES (
      @project_path,
      @atom_id,
      @atom_name,
      @file_path,
      @version_hash,
      @field_hashes_json,
      @last_modified,
      @captured_at,
      @captured_day,
      @source,
      @version_fingerprint,
      @payload_json
    )
    ON CONFLICT(version_fingerprint) DO UPDATE SET
      payload_json = excluded.payload_json
  `);

  return db.transaction(() => {
    let changes = 0;
    for (const entry of entries) {
      const row = buildArchiveRow(
        projectPath,
        entry.atomId,
        entry.atomData || {},
        entry.version || entry,
        {
          capturedAt: entry.capturedAt || options.capturedAt,
          source: entry.source || options.source || 'incremental'
        }
      );
      const result = stmt.run(row);
      changes += result.changes || 0;
    }
    return { changes };
  })();
}

export function loadAtomVersionArchiveHistory(projectPath, options = {}) {
  if (!projectPath) return [];

  const db = getAtomHistoryArchiveDb(projectPath);
  const where = ['project_path = ?'];
  const params = [projectPath];

  if (options.atomId) {
    where.push('atom_id = ?');
    params.push(options.atomId);
  }

  if (options.atomName) {
    where.push('atom_name = ?');
    params.push(options.atomName);
  }

  if (options.filePath) {
    where.push('file_path = ?');
    params.push(options.filePath);
  }

  const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 50;
  params.push(limit);

  return db.prepare(`
    SELECT *
    FROM atom_versions_archive
    WHERE ${where.join(' AND ')}
    ORDER BY captured_at DESC, id DESC
    LIMIT ?
  `).all(...params);
}

export default {
  getAtomHistoryArchiveDb,
  closeAtomHistoryArchiveDb,
  shutdownAtomHistoryArchiveStorage,
  persistAtomVersionArchiveSnapshot,
  persistAtomVersionArchiveBatch,
  loadAtomVersionArchiveHistory
};
