/**
 * Loads all file hashes into a lookup map.
 */

export function getAllFileHashes(db) {
  const rows = db.prepare('SELECT path, hash FROM files WHERE hash IS NOT NULL').all();
  const map = new Map();

  for (const row of rows) {
    map.set(row.path, row.hash);
  }

  return map;
}
