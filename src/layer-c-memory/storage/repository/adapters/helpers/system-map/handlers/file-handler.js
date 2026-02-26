/**
 * @fileoverview file-handler.js
 * Persistence handlers for system files
 */
import { safeString, safeNumber } from '../../converters.js';

export async function saveSystemFiles(db, files, now) {
  const stmt = db.prepare(`
    INSERT INTO files (path, last_analyzed, total_lines)
    VALUES (?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      last_analyzed = excluded.last_analyzed,
      total_lines = excluded.total_lines
  `);

  for (const [path, data] of Object.entries(files)) {
    stmt.run(
      path,
      new Date(now).toISOString(),
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
