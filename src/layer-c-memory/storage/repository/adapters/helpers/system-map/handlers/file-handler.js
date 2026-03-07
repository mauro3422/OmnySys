/**
 * @fileoverview file-handler.js
 * Persistence handlers for system files
 */
import { safeJson, safeNumber, safeString } from '../../converters.js';

export async function saveSystemFiles(db, files, now) {
  const insertStmt = db.prepare(`
    INSERT INTO system_files (
      path,
      display_path,
      culture,
      culture_role,
      exports_json,
      imports_json,
      definitions_json,
      used_by_json,
      calls_json,
      identifier_refs_json,
      depends_on_json,
      transitive_depends_json,
      transitive_dependents_json,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      display_path = excluded.display_path,
      culture = excluded.culture,
      culture_role = excluded.culture_role,
      exports_json = excluded.exports_json,
      imports_json = excluded.imports_json,
      definitions_json = excluded.definitions_json,
      used_by_json = excluded.used_by_json,
      calls_json = excluded.calls_json,
      identifier_refs_json = excluded.identifier_refs_json,
      depends_on_json = excluded.depends_on_json,
      transitive_depends_json = excluded.transitive_depends_json,
      transitive_dependents_json = excluded.transitive_dependents_json,
      updated_at = excluded.updated_at
  `);

  const isoNow = new Date(now).toISOString();

  for (const [path, data] of Object.entries(files)) {
    insertStmt.run(
      safeString(path),
      safeString(data.displayPath, safeString(path)),
      safeString(data.culture),
      safeString(data.cultureRole),
      safeJson(data.exports || []),
      safeJson(data.imports || []),
      safeJson(data.definitions || []),
      safeJson(data.usedBy || []),
      safeJson(data.calls || []),
      safeJson(data.identifierRefs || []),
      safeJson(data.dependsOn || []),
      safeJson(data.transitiveDepends || []),
      safeJson(data.transitiveDependents || []),
      isoNow
    );
  }
}

export async function loadSystemFiles(db) {
  const rows = db.prepare('SELECT * FROM system_files').all();
  const files = {};
  for (const row of rows) {
    files[row.path] = {
      path: row.path,
      displayPath: row.display_path,
      culture: row.culture,
      cultureRole: row.culture_role,
      exports: JSON.parse(row.exports_json || '[]'),
      imports: JSON.parse(row.imports_json || '[]'),
      definitions: JSON.parse(row.definitions_json || '[]'),
      usedBy: JSON.parse(row.used_by_json || '[]'),
      calls: JSON.parse(row.calls_json || '[]'),
      identifierRefs: JSON.parse(row.identifier_refs_json || '[]'),
      dependsOn: JSON.parse(row.depends_on_json || '[]'),
      transitiveDepends: JSON.parse(row.transitive_depends_json || '[]'),
      transitiveDependents: JSON.parse(row.transitive_dependents_json || '[]'),
      lastIndexed: row.updated_at ? new Date(row.updated_at).getTime() : null,
      lines: safeNumber(row.total_lines || 0)
    };
  }
  return files;
}
