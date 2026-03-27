import { normalizeFilePath } from './path-normalization.js';
import {
  loadPersistedCompilerPathSets,
  loadPersistedIndexedFilePaths
} from './compiler-persistence-paths.js';

export async function getPersistedIndexedFilePaths(projectPath) {
  return loadPersistedIndexedFilePaths(projectPath);
}

export async function getPersistedKnownFilePaths(projectPath) {
  try {
    const { indexedPaths, manifestPaths } = await loadPersistedCompilerPathSets(projectPath);
    return new Set([...indexedPaths, ...manifestPaths]);
  } catch {
    return new Set();
  }
}

export async function findIndexedFileCandidate(rootPath, importPath) {
  const normalizedImportPath = normalizeFilePath(importPath);
  const parts = normalizedImportPath.split('/');
  const lastPart = parts[parts.length - 1] || normalizedImportPath;
  const baseName = lastPart.replace(/\.[jt]sx?$/, '');
  const fileBaseName = baseName.split('/').pop().replace(/\.[^/.]+$/, '');

  try {
    const { withCompilerRepository } = await import('./compiler-persistence-paths.js');
    const row = await withCompilerRepository(rootPath, (repo) => repo.db.prepare(`
      SELECT file_path as path FROM atoms WHERE name = ? OR name LIKE ?
      UNION ALL
      SELECT path FROM files WHERE path LIKE ?
      LIMIT 1
    `).get(baseName, `%${baseName}%`, `%/${fileBaseName}.%`));

    return row?.path ? normalizeFilePath(row.path) : null;
  } catch {
    return null;
  }
}
