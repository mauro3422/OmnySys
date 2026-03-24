import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';

import { exportSchemaSQL } from '../../../../src/layer-c-memory/storage/database/schema-registry.js';
import {
  getMetadataExtractionCoverage,
  repairMetadataExtractionCoverage
} from '../../../../src/shared/compiler/index.js';

describe('metadata-extraction-coverage repair', () => {
  let db;

  afterEach(() => {
    db?.close();
    db = null;
  });

  it('backfills callback types, file hashes, system file calls, and file culture metadata', () => {
    db = new Database(':memory:');
    db.exec(exportSchemaSQL());

    db.prepare(`
      INSERT INTO file_hashes (file_path, content_hash, last_updated)
      VALUES (?, ?, ?)
    `).run('src/example.test.js', 'abc123', Date.now());

    db.prepare(`
      INSERT INTO files (
        path, last_analyzed, atom_count, total_complexity, total_lines, module_name,
        imports_json, exports_json, hash, is_removed
      ) VALUES (?, datetime('now'), 1, 1, 12, 'example', '[]', '[]', NULL, 0)
    `).run('src/example.test.js');

    db.prepare(`
      INSERT INTO system_files (
        path, display_path, culture, culture_role, risk_score, semantic_analysis_json,
        semantic_connections_json, exports_json, imports_json, definitions_json,
        used_by_json, calls_json, identifier_refs_json, depends_on_json,
        transitive_depends_json, transitive_dependents_json, is_removed, updated_at
      ) VALUES (?, ?, NULL, NULL, 0, '{}', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', 0, datetime('now'))
    `).run('src/example.test.js', 'src/example.test.js');

    db.prepare(`
      INSERT INTO atoms (
        id, name, atom_type, file_path, line_start, line_end, lines_of_code, complexity,
        is_test_callback, test_callback_type, calls_json, _meta_json, extracted_at, updated_at, is_removed
      ) VALUES (?, ?, 'function', ?, 1, 1, 1, 1, 0, NULL, ?, ?, datetime('now'), datetime('now'), 0)
    `).run(
      'src/example.test.js::describe_arg1',
      'describe',
      'src/example.test.js',
      JSON.stringify([{ name: 'bootstrap', type: 'internal', line: 1 }]),
      JSON.stringify({ identifierRefs: ['bootstrap', 'helperFn'] })
    );

    const repaired = repairMetadataExtractionCoverage(db);
    expect(repaired.repaired).toBe(true);
    expect(repaired.atomsUpdated).toBeGreaterThan(0);
    expect(repaired.fileHashesUpdated).toBeGreaterThan(0);
    expect(repaired.systemFilesUpdated).toBeGreaterThan(0);

    const atom = db.prepare(`
      SELECT is_test_callback, test_callback_type
      FROM atoms
      WHERE id = ?
    `).get('src/example.test.js::describe_arg1');
    expect(atom.test_callback_type).toBe('describe');
    expect(atom.is_test_callback).toBe(1);

    const file = db.prepare(`
      SELECT hash
      FROM files
      WHERE path = ?
    `).get('src/example.test.js');
    expect(file.hash).toBe('abc123');

    const systemFile = db.prepare(`
      SELECT culture, culture_role, definitions_json, calls_json, identifier_refs_json
      FROM system_files
      WHERE path = ?
    `).get('src/example.test.js');
    expect(systemFile.culture).toBe('auditor');
    expect(systemFile.culture_role).toBe('Observes and validates production atoms');
    expect(JSON.parse(systemFile.definitions_json)).toEqual([
      { type: 'function', name: 'describe', params: 0 }
    ]);
    expect(JSON.parse(systemFile.calls_json)).toEqual([
      { name: 'bootstrap', type: 'internal', line: 1 }
    ]);
    expect(JSON.parse(systemFile.identifier_refs_json)).toEqual([
      'bootstrap',
      'helperFn'
    ]);

    const coverage = getMetadataExtractionCoverage(db);
    expect(coverage.topMissingFields).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'test_callback_type' }),
        expect.objectContaining({ field: 'hash' }),
        expect.objectContaining({ field: 'calls_json' }),
        expect.objectContaining({ field: 'culture' }),
        expect.objectContaining({ field: 'culture_role' }),
        expect.objectContaining({ field: 'definitions_json' }),
        expect.objectContaining({ field: 'identifier_refs_json' })
      ])
    );
  });
});
