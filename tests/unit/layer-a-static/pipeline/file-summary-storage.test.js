import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { saveFileSummariesBatch } from '#layer-a/pipeline/file-summary-storage.js';

describe('saveFileSummariesBatch', () => {
  it('persists the file hash alongside the summary', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE files (
        path TEXT PRIMARY KEY,
        imports_json TEXT,
        exports_json TEXT,
        module_name TEXT,
        atom_count INTEGER,
        total_lines INTEGER,
        hash TEXT,
        last_analyzed TEXT,
        is_removed INTEGER DEFAULT 0,
        updated_at TEXT
      );
    `);

    const repo = { db };
    saveFileSummariesBatch(repo, [[
      'src/example.js',
      {
        imports: [{ source: './dep.js' }],
        exports: [{ name: 'example' }],
        moduleName: 'src',
        atomCount: 3,
        totalLines: 42,
        hash: 'abc123'
      }
    ]], '2026-03-24T00:00:00.000Z');

    const row = db.prepare('SELECT * FROM files WHERE path = ?').get('src/example.js');
    expect(row.hash).toBe('abc123');
    expect(row.atom_count).toBe(3);
    expect(JSON.parse(row.imports_json)).toEqual([{ source: './dep.js' }]);
  });
});
