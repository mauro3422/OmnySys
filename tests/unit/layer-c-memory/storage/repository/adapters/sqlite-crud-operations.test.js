import { beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';

import { SQLiteCrudOperations } from '#layer-c/storage/repository/adapters/sqlite-crud-operations.js';

describe('SQLiteCrudOperations.deleteByFile', () => {
  let db;
  let crudOps;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE atoms (
        id TEXT PRIMARY KEY,
        name TEXT,
        file_path TEXT,
        is_removed INTEGER DEFAULT 0,
        updated_at TEXT
      );

      CREATE TABLE atom_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        weight REAL NOT NULL DEFAULT 1,
        line_number INTEGER,
        context_json TEXT,
        created_at TEXT NOT NULL,
        is_removed INTEGER DEFAULT 0,
        lifecycle_status TEXT DEFAULT 'active',
        updated_at TEXT
      );
    `);

    crudOps = new SQLiteCrudOperations();
    crudOps.db = db;
    crudOps.projectPath = 'C:/Dev/OmnySystem';
    crudOps._logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
    crudOps.statements = {
      deleteByFile: db.prepare("UPDATE atoms SET is_removed = 1, updated_at = datetime('now') WHERE file_path = ?")
    };
  });

  it('soft-deletes call relations that originate from or point to atoms in the removed file', () => {
    db.prepare(`
      INSERT INTO atoms (id, name, file_path, is_removed, updated_at)
      VALUES
        (?, ?, ?, 0, datetime('now')),
        (?, ?, ?, 0, datetime('now')),
        (?, ?, ?, 0, datetime('now')),
        (?, ?, ?, 0, datetime('now'))
    `).run(
      'src/app/file.js::foo', 'foo', 'src/app/file.js',
      'src/app/file.js::bar', 'bar', 'src/app/file.js',
      'src/other/other.js::baz', 'baz', 'src/other/other.js',
      'src/other/other.js::qux', 'qux', 'src/other/other.js'
    );

    db.prepare(`
      INSERT INTO atom_relations (
        source_id, target_id, relation_type, weight, line_number, context_json, created_at, is_removed, lifecycle_status, updated_at
      ) VALUES
        (?, ?, 'calls', 1, 1, '{}', datetime('now'), 0, 'active', datetime('now')),
        (?, ?, 'calls', 1, 1, '{}', datetime('now'), 0, 'active', datetime('now')),
        (?, ?, 'calls', 1, 1, '{}', datetime('now'), 0, 'active', datetime('now')),
        (?, ?, 'shares_state', 1, 1, '{}', datetime('now'), 0, 'active', datetime('now'))
    `).run(
      'src/app/file.js::foo', 'src/app/file.js::bar',
      'src/other/other.js::baz', 'src/app/file.js::foo',
      'src/other/other.js::baz', 'src/other/other.js::qux',
      'src/app/file.js::foo', 'src/other/other.js::qux'
    );

    const deleted = crudOps.deleteByFile('src/app/file.js');

    expect(deleted).toBe(2);

    const affectedCalls = db.prepare(`
      SELECT source_id, target_id, is_removed, lifecycle_status
      FROM atom_relations
      WHERE relation_type = 'calls'
      ORDER BY source_id, target_id
    `).all();

    expect(affectedCalls).toEqual([
      {
        source_id: 'src/app/file.js::foo',
        target_id: 'src/app/file.js::bar',
        is_removed: 1,
        lifecycle_status: 'removed'
      },
      {
        source_id: 'src/other/other.js::baz',
        target_id: 'src/app/file.js::foo',
        is_removed: 1,
        lifecycle_status: 'removed'
      },
      {
        source_id: 'src/other/other.js::baz',
        target_id: 'src/other/other.js::qux',
        is_removed: 0,
        lifecycle_status: 'active'
      }
    ]);

    const fileAtoms = db.prepare(`
      SELECT id, is_removed
      FROM atoms
      WHERE file_path = ?
      ORDER BY id
    `).all('src/app/file.js');

    expect(fileAtoms).toEqual([
      { id: 'src/app/file.js::bar', is_removed: 1 },
      { id: 'src/app/file.js::foo', is_removed: 1 }
    ]);
  });
});
