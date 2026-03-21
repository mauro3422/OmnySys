/**
 * @fileoverview Path and dependency helpers for system-map persistence repair.
 *
 * Keeps filename resolution and dependency deduplication separate from the
 * repair orchestration so the main repair module stays compact.
 *
 * @module shared/compiler/system-map-persistence-repair-paths
 */

import path from 'path';

const DEFAULT_DEPENDENCY_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json'];

export function normalizeDbPath(value = '') {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

export function toJsonText(value, fallback = '[]') {
  try {
    return JSON.stringify(value ?? []);
  } catch {
    return fallback;
  }
}

export function dependencyKey(dependency) {
  return [
    dependency?.sourcePath || '',
    dependency?.targetPath || '',
    dependency?.dependencyType || ''
  ].join('::');
}

export function dedupeDependencies(dependencies = []) {
  const seen = new Set();
  const unique = [];

  for (const dependency of dependencies) {
    const key = dependencyKey(dependency);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(dependency);
  }

  return unique;
}

export function mergeUniquePathList(...lists) {
  const seen = new Set();
  const merged = [];

  for (const list of lists) {
    if (!Array.isArray(list)) continue;

    for (const value of list) {
      const normalized = normalizeDbPath(value);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(normalized);
    }
  }

  return merged;
}

export function parseImportSource(importEntry) {
  if (!importEntry) return '';

  if (typeof importEntry === 'string') {
    return importEntry.trim();
  }

  return String(
    importEntry.resolved ||
    importEntry.resolvedPath ||
    importEntry.targetPath ||
    importEntry.target ||
    importEntry.to ||
    importEntry.source ||
    ''
  ).trim();
}

export function parseImportSymbols(importEntry) {
  if (!importEntry || typeof importEntry !== 'object') {
    return [];
  }

  if (Array.isArray(importEntry.symbols)) {
    return importEntry.symbols;
  }

  if (Array.isArray(importEntry.specifiers)) {
    return importEntry.specifiers;
  }

  return [];
}

export function buildKnownFilePathIndex(rows = []) {
  const knownPaths = new Set();
  const orderedPaths = [];

  for (const row of rows) {
    const normalized = normalizeDbPath(row?.path || '');
    if (!normalized || knownPaths.has(normalized)) {
      continue;
    }

    knownPaths.add(normalized);
    orderedPaths.push(normalized);
  }

  orderedPaths.sort((a, b) => a.length - b.length);
  return { knownPaths, orderedPaths };
}

export function loadKnownFilePathRows(db) {
  const rows = [];

  rows.push(
    ...db.prepare(`
      SELECT path
      FROM files
      WHERE (is_removed IS NULL OR is_removed = 0)
    `).all()
  );

  rows.push(
    ...db.prepare(`
      SELECT path
      FROM system_files
      WHERE (is_removed IS NULL OR is_removed = 0)
    `).all()
  );

  rows.push(
    ...db.prepare(`
      SELECT path
      FROM compiler_scanned_files
      WHERE path IS NOT NULL
        AND path != ''
    `).all()
  );

  rows.push(
    ...db.prepare(`
      SELECT DISTINCT file_path AS path
      FROM atoms
      WHERE (is_removed IS NULL OR is_removed = 0)
        AND file_path IS NOT NULL
        AND file_path != ''
    `).all()
  );

  return rows;
}

export function generateTargetCandidates(sourcePath, importSource) {
  const source = normalizeDbPath(importSource);
  const candidates = new Set();

  if (!source) {
    return [];
  }

  candidates.add(source);

  if (source.startsWith('.') || source.startsWith('/')) {
    const basePath = normalizeDbPath(sourcePath);
    const sourceDir = path.posix.dirname(basePath);
    const resolved = normalizeDbPath(path.posix.normalize(path.posix.join(sourceDir, source)));
    candidates.add(resolved);

    const withoutExt = resolved.replace(/\.[^./]+$/, '');
    candidates.add(withoutExt);

    for (const extension of DEFAULT_DEPENDENCY_EXTENSIONS) {
      candidates.add(`${withoutExt}${extension}`);
      candidates.add(path.posix.join(withoutExt, `index${extension}`));
    }

    return Array.from(candidates).filter(Boolean);
  }

  const aliasLike = source.replace(/^#/, '').replace(/^@/, '').replace(/^\/+/, '');
  if (!aliasLike) {
    return Array.from(candidates).filter(Boolean);
  }

  const segments = aliasLike.split('/').filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    candidates.add(segments.slice(i).join('/'));
  }

  const withoutExt = aliasLike.replace(/\.[^./]+$/, '');
  candidates.add(withoutExt);
  for (const extension of DEFAULT_DEPENDENCY_EXTENSIONS) {
    candidates.add(`${withoutExt}${extension}`);
    candidates.add(path.posix.join(withoutExt, `index${extension}`));
  }

  return Array.from(candidates).filter(Boolean);
}

export function resolveTargetPathFromKnownFiles(sourcePath, importEntry, knownFileIndex) {
  const rawSource = parseImportSource(importEntry);
  if (!rawSource) {
    return null;
  }

  const exactCandidates = generateTargetCandidates(sourcePath, rawSource);

  for (const candidate of exactCandidates) {
    const normalized = normalizeDbPath(candidate);
    if (knownFileIndex.knownPaths.has(normalized)) {
      return normalized;
    }
  }

  const suffixCandidates = generateTargetCandidates('', rawSource)
    .map((candidate) => normalizeDbPath(candidate))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const suffix of suffixCandidates) {
    const matchedPath = knownFileIndex.orderedPaths.find((knownPath) =>
      knownPath === suffix || knownPath.endsWith(`/${suffix}`)
    );
    if (matchedPath) {
      return matchedPath;
    }
  }

  return null;
}
