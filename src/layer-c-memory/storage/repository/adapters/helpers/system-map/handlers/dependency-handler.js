/**
 * @fileoverview dependency-handler.js
 * Persistence handlers for file dependencies
 */
export async function saveFileDependencies(db, dependencies, now) {
  db.prepare('DELETE FROM file_dependencies').run();
  const stmt = db.prepare(`
    INSERT INTO file_dependencies (source_path, target_path, created_at)
    VALUES (?, ?, ?)
  `);

  for (const [source, targets] of Object.entries(dependencies)) {
    if (!targets || typeof targets[Symbol.iterator] !== 'function') continue;
    for (const target of targets) {
      stmt.run(source, target, now);
    }
  }
}

export async function loadFileDependencies(db) {
  const rows = db.prepare('SELECT * FROM file_dependencies').all();
  const dependencies = {};
  for (const row of rows) {
    if (!dependencies[row.source_path]) dependencies[row.source_path] = [];
    dependencies[row.source_path].push(row.target_path);
  }
  return dependencies;
}
