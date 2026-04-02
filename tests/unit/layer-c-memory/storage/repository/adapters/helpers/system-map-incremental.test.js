import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { syncIncrementalSystemMapSurface } from '../../../../../../../src/layer-c-memory/storage/repository/adapters/helpers/system-map-incremental.js';

function createDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE system_files (
      path TEXT PRIMARY KEY,
      display_path TEXT,
      culture TEXT,
      culture_role TEXT,
      risk_score REAL DEFAULT 0,
      semantic_analysis_json TEXT,
      semantic_connections_json TEXT,
      exports_json TEXT,
      imports_json TEXT,
      definitions_json TEXT,
      used_by_json TEXT,
      calls_json TEXT,
      identifier_refs_json TEXT,
      depends_on_json TEXT,
      transitive_depends_json TEXT,
      transitive_dependents_json TEXT,
      is_removed INTEGER DEFAULT 0,
      updated_at TEXT,
      lifecycle_status TEXT
    );

    CREATE TABLE file_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_path TEXT NOT NULL,
      target_path TEXT NOT NULL,
      dependency_type TEXT NOT NULL,
      symbols_json TEXT,
      reason TEXT,
      is_dynamic INTEGER DEFAULT 0,
      is_removed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

function seedSystemFile(db, path, usedBy = [], dependsOn = []) {
  db.prepare(`
    INSERT INTO system_files (
      path,
      display_path,
      culture,
      culture_role,
      risk_score,
      semantic_analysis_json,
      semantic_connections_json,
      exports_json,
      imports_json,
      definitions_json,
      used_by_json,
      calls_json,
      identifier_refs_json,
      depends_on_json,
      transitive_depends_json,
      transitive_dependents_json,
      is_removed,
      updated_at,
      lifecycle_status
    ) VALUES (?, ?, '', '', 0, '{}', '[]', '[]', '[]', '[]', ?, '[]', '[]', ?, '[]', '[]', 0, ?, 'active')
  `).run(path, path, JSON.stringify(usedBy), JSON.stringify(dependsOn), '2026-04-02T00:00:00.000Z');
}

describe('syncIncrementalSystemMapSurface', () => {
  it('updates system_files mirrors and file_dependencies for one changed file', async () => {
    const db = createDb();
    seedSystemFile(db, 'src/file.js', ['src/other.js'], ['src/old.js']);
    seedSystemFile(db, 'src/old.js', ['src/file.js'], []);
    seedSystemFile(db, 'src/next.js', [], []);
    seedSystemFile(db, 'src/other.js', [], []);

    db.prepare(`
      INSERT INTO file_dependencies (source_path, target_path, dependency_type, symbols_json, reason, is_dynamic, created_at)
      VALUES (?, ?, 'import', '[]', 'seed', 0, ?)
    `).run('src/file.js', 'src/old.js', '2026-04-02T00:00:00.000Z');
    db.prepare(`
      INSERT INTO file_dependencies (source_path, target_path, dependency_type, symbols_json, reason, is_dynamic, created_at)
      VALUES (?, ?, 'import', '[]', 'seed', 0, ?)
    `).run('src/other.js', 'src/file.js', '2026-04-02T00:00:00.000Z');

    const repo = { db };
    const fileAnalysis = {
      filePath: 'src/file.js',
      fileName: 'file.js',
      imports: [
        {
          source: './next.js',
          resolvedPath: 'src/next.js',
          type: 'local',
          specifiers: [{ name: 'nextThing' }]
        }
      ],
      exports: [{ name: 'fileThing' }],
      definitions: [{ name: 'fileThing' }],
      semanticConnections: [{ target: 'src/next.js', type: 'sharedState' }],
      metadata: { jsdocContracts: { all: [] } },
      calls: [{ name: 'run' }]
    };

    const result = await syncIncrementalSystemMapSurface(repo, fileAnalysis, '2026-04-02T12:00:00.000Z');

    expect(result).toMatchObject({
      skipped: false,
      sourcePath: 'src/file.js',
      dependenciesSaved: 1
    });

    const sourceRow = db.prepare('SELECT * FROM system_files WHERE path = ?').get('src/file.js');
    expect(JSON.parse(sourceRow.imports_json)).toEqual(fileAnalysis.imports);
    expect(JSON.parse(sourceRow.exports_json)).toEqual(fileAnalysis.exports);
    expect(JSON.parse(sourceRow.depends_on_json)).toEqual(['src/next.js']);
    expect(JSON.parse(sourceRow.used_by_json)).toEqual(['src/other.js']);

    const oldRow = db.prepare('SELECT * FROM system_files WHERE path = ?').get('src/old.js');
    expect(JSON.parse(oldRow.used_by_json)).toEqual([]);

    const nextRow = db.prepare('SELECT * FROM system_files WHERE path = ?').get('src/next.js');
    expect(JSON.parse(nextRow.used_by_json)).toEqual(['src/file.js']);

    const deps = db.prepare(`
      SELECT source_path, target_path
      FROM file_dependencies
      WHERE source_path = ?
      ORDER BY target_path
    `).all('src/file.js');
    expect(deps).toEqual([
      { source_path: 'src/file.js', target_path: 'src/next.js' }
    ]);
  });
});
