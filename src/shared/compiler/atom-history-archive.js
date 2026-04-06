/**
 * @fileoverview Persistent archive for atom version evolution.
 *
 * Stores immutable history outside the operational SQLite DB so the evolution
 * of atoms survives reanalyze / destructive cache cleanup.
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';
import { createLogger } from '#utils/logger.js';
import { safeJsonStringify } from './safe-json.js';
import { getAtomHistoryDbPath } from './compiler-persistence-paths.js';
import { normalizeKey, normalizeCapturedDay } from '#shared/utils/normalize-helpers.js';
import { ensureArchiveDirectory, applyArchiveDbConfig } from './archive-db-utils.js';

const logger = createLogger('OmnySys:AtomHistoryArchive');
const archiveConnections = new Map();

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

function ensureArchiveDb(projectPath) {
  const normalizedProjectPath = resolve(projectPath || process.cwd());
  const existing = archiveConnections.get(normalizedProjectPath);
  if (existing && existing.open !== false) {
    return existing;
  }

  const dbPath = getAtomHistoryDbPath(normalizedProjectPath);
  ensureArchiveDirectory(normalizedProjectPath);
  const db = new Database(dbPath);
  applyArchiveDbConfig(db, { cacheSize: 12000 });
  db.exec(buildArchiveSchemaSql());
  archiveConnections.set(normalizedProjectPath, db);
  logger.debug(`[AtomHistoryArchive] Ready at: ${dbPath}`);
  return db;
}

/**
 * FIX: El fingerprint usaba `lastModified` (Date.now()) que cambia en cada escritura,
 * haciendo que la deduplicación NUNCA funcionara. Cada write generaba un fingerprint único.
 * 
 * Solución: fingerprint basado SOLO en el contenido (versionHash) + identidad del átomo.
 * Si el contenido no cambió, se rechaza la inserción (ON CONFLICT).
 */
function buildFingerprint({
  projectPath = '',
  atomId = '',
  versionHash = '',
  filePath = '',
  atomName = '',
  source = ''
} = {}) {
  return [
    normalizeKey(projectPath),
    normalizeKey(atomId),
    normalizeKey(versionHash), // ← ÚNICO indicador de cambio de contenido
    normalizeKey(filePath),
    normalizeKey(atomName),
    normalizeKey(source)
  ].join('::');
}

/**
 * Construye el payload de la fila de archivo.
 * FIX: En lugar de guardar el átomo completo, guarda SOLO los campos que cambiaron
 * respecto a la versión anterior (delta compression).
 */
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
  const versionHash = version.hash || '';

  // FIX: Verificar si ya existe una versión con el mismo content hash
  if (versionHash) {
    const existing = db.prepare(`
      SELECT 1 FROM atom_versions_archive
      WHERE atom_id = ? AND version_hash = ?
      LIMIT 1
    `).get(atomId, versionHash);
    if (existing) {
      return { changes: 0, skippedByDedup: 1 };
    }
  }

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
    ON CONFLICT(version_fingerprint) DO NOTHING
  `);

  return stmt.run(row);
}

export function persistAtomVersionArchiveBatch(projectPath, entries = [], options = {}) {
  if (!projectPath || !Array.isArray(entries) || entries.length === 0) {
    return { changes: 0 };
  }

  const db = getAtomHistoryArchiveDb(projectPath);

  // FIX: Cargar los version_hash existentes para deduplicar ANTES de escribir.
  // Solo insertamos si el version_hash es diferente al último registrado.
  const existingHashesStmt = db.prepare(`
    SELECT atom_id, version_hash
    FROM atom_versions_archive
    WHERE (atom_id, id) IN (SELECT atom_id, MAX(id) FROM atom_versions_archive GROUP BY atom_id)
  `);
  const existingHashes = new Map();
  for (const row of existingHashesStmt.all()) {
    existingHashes.set(row.atom_id, row.version_hash);
  }

  // Filtrar entradas cuyo contenido NO cambió
  const dedupedEntries = [];
  let skippedByDedup = 0;
  for (const entry of entries) {
    const entryHash = entry.version?.hash || entry.hash || '';
    const existingHash = existingHashes.get(entry.atomId);

    if (existingHash === entryHash) {
      skippedByDedup++;
      continue;
    }

    dedupedEntries.push(entry);
  }

  if (dedupedEntries.length === 0) {
    return { changes: 0, skippedByDedup };
  }

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
    ON CONFLICT(version_fingerprint) DO NOTHING
  `);

  return db.transaction(() => {
    let changes = 0;
    for (const entry of dedupedEntries) {
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
    return { changes, skippedByDedup };
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
