import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';

import {
  getMetadataExtractionCoverage,
  summarizeMetadataExtractionCoverage
} from '../../../../src/shared/compiler/metadata-extraction-coverage/coverage.js';

describe('metadata-extraction-coverage', () => {
  let db;

  afterEach(() => {
    db?.close();
    db = null;
  });

  it('summarizes extracted metadata coverage across atoms, files and system_files', () => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE atoms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        atom_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        lines_of_code INTEGER NOT NULL,
        complexity INTEGER NOT NULL,
        parameter_count INTEGER DEFAULT 0,
        is_exported BOOLEAN DEFAULT 0,
        function_type TEXT,
        shared_state_json TEXT,
        event_emitters_json TEXT,
        event_listeners_json TEXT,
        called_by_json TEXT,
        calls_json TEXT,
        created_at TEXT,
        updated_at TEXT,
        is_removed INTEGER DEFAULT 0,
        lifecycle_status TEXT,
        is_test_callback BOOLEAN DEFAULT 0,
        test_callback_type TEXT,
        _meta_json TEXT
      );

      CREATE TABLE files (
        path TEXT PRIMARY KEY,
        last_analyzed TEXT NOT NULL,
        atom_count INTEGER DEFAULT 0,
        total_complexity INTEGER DEFAULT 0,
        total_lines INTEGER DEFAULT 0,
        module_name TEXT,
        imports_json TEXT,
        exports_json TEXT,
        semantic_analysis_json TEXT,
        semantic_connections_json TEXT,
        is_removed INTEGER DEFAULT 0,
        hash TEXT,
        updated_at TEXT
      );

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
        is_removed INTEGER DEFAULT 0,
        updated_at TEXT,
        calls_json TEXT,
        identifier_refs_json TEXT,
        used_by_json TEXT,
        depends_on_json TEXT,
        transitive_depends_json TEXT,
        transitive_dependents_json TEXT
      );

      CREATE TABLE file_hashes (
        file_path TEXT PRIMARY KEY,
        content_hash TEXT NOT NULL,
        last_updated INTEGER NOT NULL
      );
    `);

    db.prepare(`
      INSERT INTO atoms (
        id, name, atom_type, file_path, line_start, line_end, lines_of_code, complexity,
        parameter_count, is_exported, function_type, shared_state_json, event_emitters_json,
        event_listeners_json, called_by_json, created_at, updated_at, is_removed, lifecycle_status
      ) VALUES
        (?, ?, 'function', 'src/a.js', 1, 10, 10, 3, 2, 1, 'function', '[{"fullReference":"process.env.DEBUG"}]', '[]', '[]', '["src/b.js::beta"]', datetime('now'), datetime('now'), 0, 'active'),
        (?, ?, 'function', 'src/b.js', 1, 8, 8, 2, 0, 0, 'arrow', NULL, '[{"eventName":"ready"}]', '[{"eventName":"ready"}]', '[]', datetime('now'), datetime('now'), 0, 'active'),
        (?, ?, 'arrow', 'tests/example.test.js', 1, 6, 6, 1, 0, 0, 'arrow', NULL, '[]', '[]', '[]', datetime('now'), datetime('now'), 0, 'active')
    `).run('atom-a', 'alpha', 'atom-b', 'beta', 'atom-c', 'gamma');

    db.prepare(`
      UPDATE atoms
      SET is_test_callback = 1, test_callback_type = 'describe'
      WHERE id = ?
    `).run('atom-b');

    db.prepare(`
      INSERT INTO files (
        path, last_analyzed, atom_count, total_complexity, total_lines, module_name,
        imports_json, exports_json, semantic_analysis_json, semantic_connections_json, is_removed
      ) VALUES
        (?, datetime('now'), 2, 5, 18, 'module-a', '["a"]', '["x"]', '{"ok":true}', '[]', 0),
        (?, datetime('now'), 1, 2, 8, 'module-b', NULL, '[]', NULL, NULL, 0)
    `).run('src/a.js', 'src/b.js');

    db.prepare(`
      INSERT INTO system_files (
        path, display_path, culture, culture_role, risk_score, semantic_analysis_json,
        semantic_connections_json, exports_json, imports_json, definitions_json, is_removed
      ) VALUES
        (?, 'src/a.js', 'feature', 'primary', 0.2, '{"signals":1}', '[]', '["x"]', '["a"]', '{"defs":1}', 0),
        (?, 'src/b.js', 'feature', 'support', 0.1, NULL, NULL, NULL, NULL, NULL, 0)
    `).run('src/a.js', 'src/b.js');

    const coverage = getMetadataExtractionCoverage(db);
    const summary = summarizeMetadataExtractionCoverage(coverage);

    expect(summary.totalTables).toBe(3);
    expect(summary.totalFields).toBeGreaterThan(0);
    expect(summary.coveredFields).toBeGreaterThan(0);
    expect(summary.coverageRatio).toBeGreaterThan(0);
    expect(summary.coverageRatio).toBeLessThan(1);
    expect(coverage.tables).toHaveLength(3);
    const atomsTable = coverage.tables.find((table) => table.table === 'atoms');
    const calledByField = atomsTable?.fields.find((field) => field.field === 'called_by_json');
    const testCallbackField = atomsTable?.fields.find((field) => field.field === 'test_callback_type');
    expect(calledByField?.populatedRows).toBeGreaterThan(0);
    expect(calledByField?.coverageRatio).toBeGreaterThan(0);
    expect(testCallbackField?.eligibleRows).toBe(1);
    expect(testCallbackField?.populatedRows).toBe(1);
    expect(testCallbackField?.state).toBe('covered');
    expect(coverage.primaryIssue?.field).not.toBe('test_callback_type');
    expect(atomsTable?.fields.some((field) => field.field === 'shared_state_json')).toBe(true);
    expect(coverage.tables.find((table) => table.table === 'files')?.fields.some((field) => field.field === 'semantic_connections_json')).toBe(true);
    expect(coverage.tables.find((table) => table.table === 'system_files')?.fields.some((field) => field.field === 'semantic_analysis_json')).toBe(true);
  });
});
