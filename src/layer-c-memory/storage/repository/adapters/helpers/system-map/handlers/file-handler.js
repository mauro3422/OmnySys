/**
 * @fileoverview file-handler.js
 * Persistence handlers for system files
 */
import { safeString, safeNumber } from '../../converters.js';

export async function saveSystemFiles(db, files, now) {
  const insertStmt = db.prepare(`
    INSERT INTO files (path, last_analyzed, total_lines)
    VALUES (?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      last_analyzed = excluded.last_analyzed,
      total_lines = excluded.total_lines
  `);

  const isoNow = new Date(now).toISOString();

  for (const [path, data] of Object.entries(files)) {
    insertStmt.run(
      path,
      isoNow,
      safeNumber(data.lines || data.totalLines || 0)
    );
  }
}

export async function loadSystemFiles(db) {
  const rows = db.prepare('SELECT * FROM files').all();
  const files = {};
  for (const row of rows) {
    files[row.path] = {
      path: row.path,
      lines: row.total_lines,
      lastIndexed: new Date(row.last_analyzed).getTime()
    };
  }
  return files;
}
