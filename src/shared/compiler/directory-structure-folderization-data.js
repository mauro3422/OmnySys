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

export function loadFolderizationRows(repo) {
  if (!repo?.db?.prepare) {
    return [];
  }

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
      exportCount: exports.length
    };
  });
}

export { normalizeFolderizationPath, parseFolderizationArray, parseImportTarget };
