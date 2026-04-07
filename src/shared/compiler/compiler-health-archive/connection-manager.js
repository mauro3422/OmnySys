import Database from 'better-sqlite3';
import { resolve } from 'path';
import { createLogger } from '#utils/logger.js';
import { getCompilerHistoryDbPath } from '../compiler-persistence-paths.js';
import { ensureArchiveDirectory, applyArchiveDbConfig } from '../archive-db-utils.js';
import { buildArchiveSchemaSql } from './schema.js';

const logger = createLogger('OmnySys:Compiler:HealthArchive');
const archiveConnections = new Map();

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

function getCompilerHealthArchiveDb(projectPath = process.cwd()) {
  return ensureArchiveDb(projectPath);
}

function closeCompilerHealthArchiveDb(projectPath = process.cwd()) {
  const normalizedProjectPath = resolve(projectPath || process.cwd());
  const db = archiveConnections.get(normalizedProjectPath);
  if (db?.open !== false) {
    db.close();
  }
  archiveConnections.delete(normalizedProjectPath);
}

function shutdownCompilerHealthArchiveStorage() {
  for (const projectPath of archiveConnections.keys()) {
    closeCompilerHealthArchiveDb(projectPath);
  }
}

export { ensureArchiveDb, getCompilerHealthArchiveDb, closeCompilerHealthArchiveDb, shutdownCompilerHealthArchiveStorage, archiveConnections };
