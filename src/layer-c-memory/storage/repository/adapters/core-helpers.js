import { normalizePath } from '../../../../shared/utils/path-utils.js';
import { buildAtomInsertSql } from './helpers/atom-schema.js';
import { persistSystemMapToDb, retrieveSystemMapFromDb } from './helpers/system-map.js';

export function initializeSQLiteAdapterCore(core, projectPath, deps) {
  const { connectionManager, logger } = deps;
  core.projectPath = projectPath;
  connectionManager.initialize(projectPath);
  core.db = connectionManager.getDatabase();
  core.statements = buildSQLiteAdapterStatements(core.db, deps);
  core.initialized = true;
  logger.debug('[SQLiteAdapter] Initialized successfully');
}

export function buildSQLiteAdapterStatements(db) {
  return {
    getById: db.prepare('SELECT * FROM atoms WHERE id = ? AND is_removed = 0'),
    getByFile: db.prepare('SELECT * FROM atoms WHERE file_path = ? AND is_removed = 0'),
    insertAtom: db.prepare(buildAtomInsertSql()),
    deleteById: db.prepare("UPDATE atoms SET is_removed = 1, updated_at = datetime('now') WHERE id = ?"),
    deleteByFile: db.prepare("UPDATE atoms SET is_removed = 1, updated_at = datetime('now') WHERE file_path = ?"),
    deleteFile: db.prepare("UPDATE files SET is_removed = 1, updated_at = datetime('now') WHERE path = ?"),
    query: db.prepare('SELECT * FROM files WHERE path = ? AND is_removed = 0'),
    getAll: db.prepare('SELECT * FROM atoms WHERE is_removed = 0 LIMIT ? OFFSET ?'),
    getCallers: db.prepare(`
      SELECT a.id, a.name, a.file_path, r.weight, r.line_number
      FROM atom_relations r
      JOIN atoms a ON r.source_id = a.id
      WHERE r.target_id = ? AND r.relation_type = 'calls'
        AND r.is_removed = 0 AND a.is_removed = 0
    `),
    getCallees: db.prepare(`
      SELECT a.id, a.name, a.file_path, r.weight, r.line_number
      FROM atom_relations r
      JOIN atoms a ON r.target_id = a.id
      WHERE r.source_id = ? AND r.relation_type = 'calls'
        AND r.is_removed = 0 AND a.is_removed = 0
    `),
    exists: db.prepare('SELECT 1 FROM atoms WHERE id = ? AND is_removed = 0')
  };
}

export function normalizeSQLiteAdapterPath(filePath, projectPath) {
  return normalizePath(filePath, projectPath);
}

export function shutdownSQLiteAdapterCore(core, connectionManager) {
  connectionManager.shutdown();
  core.initialized = false;
  core.db = null;
  core.statements = {};
}

export function syncSQLiteAdapterSystemMap(core, connectionManager, systemMap, logger) {
  return persistSystemMapToDb(core.db, connectionManager, systemMap, logger);
}

export function loadSQLiteAdapterSystemMap(core) {
  return retrieveSystemMapFromDb(core.db);
}
