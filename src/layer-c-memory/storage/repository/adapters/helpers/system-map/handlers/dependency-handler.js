import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';
import { safeJson, safeString } from '../../converters.js';

function normalizeDependencies(dependencies) {
  if (Array.isArray(dependencies)) {
    return dependencies
      .map((dep) => ({
        source: safeString(dep?.from || dep?.source),
        target: safeString(dep?.to || dep?.target),
        dependencyType: safeString(dep?.type, 'import'),
        symbolsJson: safeJson(dep?.symbols || []),
        reason: safeString(dep?.reason),
        isDynamic: dep?.dynamic ? 1 : 0
      }))
      .filter((dep) => dep.source && dep.target);
  }

  return Object.entries(dependencies || {})
    .flatMap(([source, targets]) => {
      if (!targets || typeof targets[Symbol.iterator] !== 'function') return [];
      return Array.from(targets)
        .map((target) => ({
          source: safeString(source),
          target: safeString(target),
          dependencyType: 'import',
          symbolsJson: safeJson([]),
          reason: null,
          isDynamic: 0
        }))
        .filter((dep) => dep.source && dep.target);
    });
}

export async function saveFileDependencies(db, dependencies, now) {
  const hr = new BaseSqlRepository(db, 'DependencyHandler');
  hr.clearTable('file_dependencies');
  const stmt = db.prepare(`
    INSERT INTO file_dependencies (
      source_path,
      target_path,
      dependency_type,
      symbols_json,
      reason,
      is_dynamic,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const dep of normalizeDependencies(dependencies)) {
    stmt.run(
      dep.source,
      dep.target,
      dep.dependencyType,
      dep.symbolsJson,
      dep.reason,
      dep.isDynamic,
      now
    );
  }
}

function parseJsonList(value) {
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
}

function normalizeLoadedDependency(row) {
  return {
    targetPath: row.target_path,
    type: row.dependency_type,
    symbols: parseJsonList(row.symbols_json),
    reason: row.reason,
    dynamic: Boolean(row.is_dynamic)
  };
}

function groupLoadedDependencies(rows) {
  const dependencies = {};
  for (const row of rows) {
    if (!dependencies[row.source_path]) dependencies[row.source_path] = [];
    dependencies[row.source_path].push(normalizeLoadedDependency(row));
  }
  return dependencies;
}

export async function loadFileDependencies(db) {
  const rows = db.prepare('SELECT * FROM file_dependencies').all();
  return groupLoadedDependencies(rows);
}
