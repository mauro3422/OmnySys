/**
 * @fileoverview file-handler.js
 * Persistence handlers for system files
 */
import { safeString, safeNumber } from '../../converters.js';

export async function saveSystemFiles(db, files, now) {
  const stmt = db.prepare(`
    INSERT INTO files (path, name, ext, content_hash, lines, size, last_indexed, last_modified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      name = excluded.name,
      ext = excluded.ext,
      content_hash = excluded.content_hash,
      lines = excluded.lines,
      size = excluded.size,
      last_indexed = excluded.last_indexed,
      last_modified = excluded.last_modified
  `);

  for (const [path, data] of Object.entries(files)) {
    stmt.run(
      path,
      safeString(data.name),
      safeString(data.ext),
      safeString(data.contentHash),
      safeNumber(data.lines),
      safeNumber(data.size),
      now,
      safeNumber(data.lastModified)
    );
  }
}

export async function loadSystemFiles(db) {
  const rows = db.prepare('SELECT * FROM files').all();
  const files = {};
  for (const row of rows) {
    files[row.path] = {
      path: row.path,
      name: row.name,
      ext: row.ext,
      contentHash: row.content_hash,
      lines: row.lines,
      size: row.size,
      lastIndexed: row.last_indexed,
      lastModified: row.last_modified
    };
  }
  return files;
}
