import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';

import { exportSchemaSQL } from '../../../../src/layer-c-memory/storage/database/schema-registry.js';
import { getDatabaseHealthSummary } from '../../../../src/shared/compiler/database-health.js';
import { getSystemMapPersistenceCoverage } from '../../../../src/shared/compiler/system-map-persistence.js';

describe('database-health', () => {
  let db;

  afterEach(() => {
    db?.close();
    db = null;
  });

  it('repairs empty system_files from the primary file surface before scoring health', () => {
    db = new Database(':memory:');
    db.exec(exportSchemaSQL());
    db.exec(`
      CREATE VIEW IF NOT EXISTS call_graph AS
      SELECT
        a1.id AS caller_id,
        a1.name AS caller_name,
        a1.file_path AS caller_file,
        a2.id AS callee_id,
        a2.name AS callee_name,
        a2.file_path AS callee_file,
        r.weight,
        r.line_number
      FROM atom_relations r
      JOIN atoms a1 ON r.source_id = a1.id
      JOIN atoms a2 ON r.target_id = a2.id
      WHERE r.relation_type = 'calls'
        AND (r.is_removed IS NULL OR r.is_removed = 0);
    `);

    db.prepare(`
      INSERT INTO compiler_scanned_files (path, first_seen, last_seen)
      VALUES
        (?, datetime('now'), datetime('now')),
        (?, datetime('now'), datetime('now'))
    `).run('src/a.js', 'src/b.js');

    db.prepare(`
      INSERT INTO files (
        path, last_analyzed, atom_count, total_complexity, total_lines, module_name,
        imports_json, exports_json, is_removed
      ) VALUES
        (?, datetime('now'), 1, 3, 12, 'module-a', '[{"resolved":"src/b.js","symbols":["beta"]}]', '["alpha"]', 0),
        (?, datetime('now'), 1, 2, 8, 'module-b', '[]', '["beta"]', 0)
    `).run('src/a.js', 'src/b.js');

    const summary = getDatabaseHealthSummary(db);
    const coverage = getSystemMapPersistenceCoverage(db);

    expect(coverage.healthy).toBe(true);
    expect(coverage.systemFilesTotal).toBe(2);
    expect(coverage.fileDependenciesTotal).toBeGreaterThan(0);
    expect(summary.healthy).toBe(true);
    expect(summary.healthScore).toBeGreaterThanOrEqual(85);
    expect(summary.metrics.activeSystemFiles).toBe(2);
    expect(summary.metrics.systemMapCoverage.fileDependenciesTotal).toBeGreaterThan(0);
  });

  it('defers live-row sync while phase2 is still pending', () => {
    db = new Database(':memory:');
    db.exec(exportSchemaSQL());
    db.exec(`
      CREATE VIEW IF NOT EXISTS call_graph AS
      SELECT
        a1.id AS caller_id,
        a1.name AS caller_name,
        a1.file_path AS caller_file,
        a2.id AS callee_id,
        a2.name AS callee_name,
        a2.file_path AS callee_file,
        r.weight,
        r.line_number
      FROM atom_relations r
      JOIN atoms a1 ON r.source_id = a1.id
      JOIN atoms a2 ON r.target_id = a2.id
      WHERE r.relation_type = 'calls'
        AND (r.is_removed IS NULL OR r.is_removed = 0);
    `);

    db.prepare(`
      INSERT INTO compiler_scanned_files (path, first_seen, last_seen)
      VALUES (?, datetime('now'), datetime('now'))
    `).run('src/a.js');

    db.prepare(`
      INSERT INTO files (
        path, last_analyzed, atom_count, total_complexity, total_lines, module_name,
        imports_json, exports_json, is_removed
      ) VALUES
        (?, datetime('now'), 1, 3, 12, 'module-a', '[]', '["alpha"]', 0),
        (?, datetime('now'), 0, 0, 0, 'module-b', '[]', '[]', 0)
    `).run('src/a.js', 'src/b.js');

    db.prepare(`
      INSERT INTO atoms (
        id, name, atom_type, file_path, line_start, line_end, lines_of_code, complexity,
        extracted_at, updated_at, is_removed, is_phase2_complete
      ) VALUES
        (?, ?, 'function', ?, 1, 10, 10, 3, datetime('now'), datetime('now'), 0, 0)
    `).run('src/a.js::alpha', 'alpha', 'src/a.js');

    const summary = getDatabaseHealthSummary(db);

    expect(summary.metrics.liveRowSync?.skipped).toBe(true);
    expect(summary.metrics.liveRowSync?.skippedReason).toBe('phase2_settling');
    expect(summary.metrics.liveRowSync?.phase2PendingFiles).toBe(1);
    expect(summary.metrics.systemMapCoverage.healthy).toBe(false);
  });
});
