/**
 * @fileoverview path-utils.js
 *
 * Utilidades para normalización y manejo de paths.
 * Todas las operaciones de path del grafo deben pasar por aquí.
 *
 * @module graph/utils/path
 */

import path from 'path';

export { normalizePath, getFileExtension, isTestFile, isScriptFile, isAbsolutePath, arePathsEqual } from '../../shared/utils/path-utils.js';

export { default as pathJoin } from 'path';
export { default as pathBasename } from 'path';
export { default as pathDirname } from 'path';
export { default as pathExtname } from 'path';

export function resolveImportPath(fromFile, importSource, extension = '.js') {
  const currentDir = path.dirname(fromFile);
  let resolvedPath = path.join(currentDir, importSource);

  if (!path.extname(resolvedPath)) {
    resolvedPath += extension;
  }

  return normalizePath(resolvedPath);
}

export function uniquePaths(paths) {
  return [...new Set(paths)].sort();
}

export function pathsEqual(pathA, pathB) {
  if (pathA == null && pathB == null) return true;
  if (pathA == null || pathB == null) return false;
  return normalizePath(pathA) === normalizePath(pathB);
}

export function isRelativePath(importSource) {
  if (importSource == null) return false;
  return importSource.startsWith('./') || importSource.startsWith('../');
}

export function getDisplayPath(normalizedPath) {
  if (normalizedPath == null) return '';
  const srcIndex = normalizedPath.indexOf('/src/');
  if (srcIndex !== -1) {
    return normalizedPath.substring(srcIndex + 1);
  }
  return normalizedPath.split('/').pop() || normalizedPath;
}