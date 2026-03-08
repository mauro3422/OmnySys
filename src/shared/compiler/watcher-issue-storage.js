/**
 * @fileoverview Shared storage helpers for watcher diagnostics.
 *
 * Keeps path normalization and stale snapshot detection reusable across
 * FileWatcher persistence/runtime surfaces.
 *
 * @module shared/compiler/watcher-issue-storage
 */

import fs from 'fs/promises';
import path from 'path';
import { normalizePath } from '#shared/utils/path-utils.js';

const WATCHER_RUNTIME_DEPENDENCY_PATHS = [
  'src/core/file-watcher',
  'src/shared/compiler'
];

export function normalizeWatcherIssueFilePath(projectPath, filePath) {
  const rawPath = String(filePath || '').trim();
  if (!rawPath) return rawPath;

  const normalized = path.isAbsolute(rawPath)
    ? path.relative(projectPath, rawPath)
    : rawPath;

  return normalizePath(normalized);
}

function collectReferencedAtomIds(alert = {}) {
  const context = (alert?.context && typeof alert.context === 'object') ? alert.context : {};
  const candidates = [
    context.atomId,
    ...(Array.isArray(context.changedAtomIds) ? context.changedAtomIds : []),
    ...(Array.isArray(context.cyclePath) ? context.cyclePath : [])
  ];

  return [...new Set(
    candidates
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .filter((value) => value.includes('::'))
  )];
}

function collectReferencedSymbols(alert = {}) {
  const context = (alert?.context && typeof alert.context === 'object') ? alert.context : {};
  const findings = Array.isArray(context.findings) ? context.findings : [];
  const symbols = findings
    .map((finding) => String(finding?.symbol || '').trim())
    .filter(Boolean);

  return [...new Set(symbols)];
}

async function getMaxMtimeRecursively(absolutePath) {
  try {
    let maxMtimeMs = 0;
    const pendingPaths = [absolutePath];

    while (pendingPaths.length > 0) {
      const currentPath = pendingPaths.pop();
      const stat = await fs.stat(currentPath);
      if (stat.mtimeMs > maxMtimeMs) {
        maxMtimeMs = stat.mtimeMs;
      }

      if (!stat.isDirectory()) {
        continue;
      }

      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        pendingPaths.push(path.join(currentPath, entry.name));
      }
    }

    return maxMtimeMs;
  } catch {
    return 0;
  }
}

async function getCachedRuntimeDependencyMtime(projectPath, relativePath, runtimeDependencyMtimes) {
  if (!relativePath) return 0;
  if (runtimeDependencyMtimes.has(relativePath)) {
    return runtimeDependencyMtimes.get(relativePath);
  }

  let mtimeMs = 0;
  try {
    const absolutePath = path.resolve(projectPath, relativePath);
    mtimeMs = await getMaxMtimeRecursively(absolutePath);
  } catch {
    mtimeMs = 0;
  }

  runtimeDependencyMtimes.set(relativePath, mtimeMs);
  return mtimeMs;
}

async function getCachedFileContents(absolutePath, fileContentsCache) {
  if (fileContentsCache.has(absolutePath)) {
    return fileContentsCache.get(absolutePath);
  }

  try {
    const contents = await fs.readFile(absolutePath, 'utf8');
    fileContentsCache.set(absolutePath, contents);
    return contents;
  } catch {
    fileContentsCache.set(absolutePath, '');
    return '';
  }
}

function getAlertFileSnapshot(projectPath, alert) {
  const id = alert?.id;
  if (!Number.isInteger(id)) return null;

  const detectedAtMs = Date.parse(alert?.detectedAt || '');
  if (!Number.isFinite(detectedAtMs)) return null;

  const relativePath = String(alert?.filePath || '');
  if (!relativePath) return null;

  return {
    id,
    detectedAtMs,
    relativePath,
    absolutePath: path.resolve(projectPath, relativePath)
  };
}

async function isAlertOutdatedByMissingSymbols(alert, absolutePath, fileContentsCache) {
  const referencedSymbols = collectReferencedSymbols(alert);
  if (referencedSymbols.length === 0) {
    return false;
  }

  const contents = await getCachedFileContents(absolutePath, fileContentsCache);
  return referencedSymbols.some((symbol) => !contents.includes(symbol));
}

async function isAlertOutdatedByRuntimeDependencies(projectPath, detectedAtMs, runtimeDependencyMtimes) {
  for (const dependencyPath of WATCHER_RUNTIME_DEPENDENCY_PATHS) {
    const dependencyMtimeMs = await getCachedRuntimeDependencyMtime(
      projectPath,
      dependencyPath,
      runtimeDependencyMtimes
    );
    if (dependencyMtimeMs > (detectedAtMs + 1000)) {
      return true;
    }
  }

  return false;
}

export function findOrphanedWatcherAlertIds(db, alerts = []) {
  if (!db) return [];

  const orphanedIds = [];
  const atomExistenceStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM atoms
    WHERE id = ?
  `);

  for (const alert of alerts) {
    const id = alert?.id;
    if (!Number.isInteger(id)) continue;

    const referencedAtomIds = collectReferencedAtomIds(alert);
    if (referencedAtomIds.length === 0) {
      continue;
    }

    const hasAnyReferencedAtom = referencedAtomIds.some((atomId) => {
      const row = atomExistenceStmt.get(atomId);
      return Number(row?.count || 0) > 0;
    });

    if (!hasAnyReferencedAtom) {
      orphanedIds.push(id);
    }
  }

  return orphanedIds;
}

export async function findOutdatedWatcherAlertIds(projectPath, alerts = []) {
  const outdatedIds = [];
  const runtimeDependencyMtimes = new Map();
  const fileContentsCache = new Map();

  for (const alert of alerts) {
    const snapshot = getAlertFileSnapshot(projectPath, {
      ...alert,
      filePath: normalizeWatcherIssueFilePath(projectPath, alert?.filePath)
    });
    if (!snapshot) continue;

    const { id, detectedAtMs, absolutePath } = snapshot;
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.mtimeMs > (detectedAtMs + 1000)) {
        outdatedIds.push(id);
        continue;
      }

      if (await isAlertOutdatedByMissingSymbols(alert, absolutePath, fileContentsCache)) {
        outdatedIds.push(id);
        continue;
      }
    } catch {
      // Deleted files should immediately invalidate any persisted watcher alert
      // targeting the old path instead of waiting for a separate lifecycle pass.
      outdatedIds.push(id);
      continue;
    }

    if (await isAlertOutdatedByRuntimeDependencies(projectPath, detectedAtMs, runtimeDependencyMtimes)) {
      outdatedIds.push(id);
    }
  }

  return outdatedIds;
}
