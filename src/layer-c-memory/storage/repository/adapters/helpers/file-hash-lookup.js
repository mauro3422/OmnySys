/**
 * Loads all file hashes into a lookup map from file_hashes (canonical source).
 */

export function getAllFileHashes(db) {
  const rows = db.prepare('SELECT file_path, content_hash FROM file_hashes').all();
  const map = new Map();

  for (const row of rows) {
    map.set(row.file_path, row.content_hash);
  }

  return map;
}
