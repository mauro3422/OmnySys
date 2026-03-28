function normalizeFolderizationPath(filePath = '') {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function parseFolderizationArray(value, fallback = []) {
  if (value == null || value === '') {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseImportTarget(importEntry = {}) {
  if (typeof importEntry === 'string') {
    return normalizeFolderizationPath(importEntry);
  }

  return normalizeFolderizationPath(
    importEntry?.resolved
    || importEntry?.target
    || importEntry?.source
    || importEntry?.path
    || importEntry?.filePath
    || ''
  );
}

function loadFolderizationVersionStats(repo) {
  if (!repo?.db?.prepare) {
    return new Map();
  }

  const versionRows = repo.db.prepare(`
    SELECT file_path, COUNT(*) AS version_count, MAX(last_modified) AS latest_version_at, MIN(last_modified) AS earliest_version_at
    FROM atom_versions
    WHERE file_path IS NOT NULL
    GROUP BY file_path
  `).all();

  const stats = new Map();

  for (const row of versionRows) {
    const filePath = normalizeFolderizationPath(row.file_path);
    if (!filePath) {
      continue;
    }

    stats.set(filePath, {
      versionCount: Number(row.version_count) || 0,
      latestVersionAt: row.latest_version_at || null,
      earliestVersionAt: row.earliest_version_at || null
    });
  }

  return stats;
}

export function loadFolderizationRows(repo) {
  if (!repo?.db?.prepare) {
    return [];
  }

  const versionStats = loadFolderizationVersionStats(repo);

  return repo.db.prepare(`
    SELECT path, module_name, imports_json, exports_json, atom_count, total_lines, updated_at
    FROM files
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND path IS NOT NULL
  `).all().map((row) => {
    const imports = parseFolderizationArray(row.imports_json, []);
    const exports = parseFolderizationArray(row.exports_json, []);
    const path = normalizeFolderizationPath(row.path);
    const importTargets = imports.map(parseImportTarget).filter(Boolean);
    const versionStatsForPath = versionStats.get(path) || {};

    return {
      path,
      directory: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '',
      basename: path.split('/').pop() || '',
      moduleName: row.module_name || null,
      atomCount: Number(row.atom_count) || 0,
      totalLines: Number(row.total_lines) || 0,
      updatedAt: row.updated_at || null,
      imports,
      importTargets,
      importCount: importTargets.length,
      exports,
      exportCount: exports.length,
      versionCount: versionStatsForPath.versionCount || 0,
      latestVersionAt: versionStatsForPath.latestVersionAt || null,
      earliestVersionAt: versionStatsForPath.earliestVersionAt || null
    };
  });
}

export { normalizeFolderizationPath, parseFolderizationArray, parseImportTarget };
