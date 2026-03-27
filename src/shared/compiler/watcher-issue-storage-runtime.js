/**
 * @fileoverview Runtime freshness helpers for watcher issue storage.
 *
 * @module shared/compiler/watcher-issue-storage-runtime
 */

import fs from 'fs/promises';
import path from 'path';
import { isAlertOutdatedByDuplicatePolicy } from './watcher-issue-duplicate-policy.js';
import { collectWatcherAlertReferencedSymbols, loadWatcherLiveFileSymbols, normalizeWatcherAlertPath } from './watcher-issue-storage-alerts.js';

const WATCHER_RUNTIME_DEPENDENCY_PATHS = [
  'src/core/file-watcher',
  'src/shared/compiler'
];

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
  const referencedSymbols = collectWatcherAlertReferencedSymbols(alert);
  if (referencedSymbols.length === 0) {
    return false;
  }

  const contents = await getCachedFileContents(absolutePath, fileContentsCache);
  return referencedSymbols.some((symbol) => !contents.includes(symbol));
}

function isAlertOutdatedByCanonicalSymbols(alert, relativePath, db, fileSymbolCache) {
  const referencedSymbols = collectWatcherAlertReferencedSymbols(alert);
  if (referencedSymbols.length === 0 || !db || !relativePath) {
    return false;
  }

  if (!fileSymbolCache.has(relativePath)) {
    fileSymbolCache.set(relativePath, new Set(loadWatcherLiveFileSymbols(db, relativePath)));
  }

  const liveSymbols = fileSymbolCache.get(relativePath);
  return referencedSymbols.some((symbol) => !liveSymbols.has(symbol));
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

export async function findOutdatedWatcherAlertIds(projectPath, alerts = [], options = {}) {
  const outdatedIds = [];
  const runtimeDependencyMtimes = new Map();
  const fileContentsCache = new Map();
  const fileSymbolCache = new Map();
  const { db = null } = options;

  for (const alert of alerts) {
    const snapshot = getAlertFileSnapshot(projectPath, {
      ...alert,
      filePath: normalizeWatcherAlertPath(projectPath, alert?.filePath)
    });
    if (!snapshot) continue;

    const { id, detectedAtMs, absolutePath, relativePath } = snapshot;
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.mtimeMs > (detectedAtMs + 1000)) {
        outdatedIds.push(id);
        continue;
      }

      if (isAlertOutdatedByCanonicalSymbols(alert, relativePath, db, fileSymbolCache)) {
        outdatedIds.push(id);
        continue;
      }

      if (isAlertOutdatedByDuplicatePolicy(alert, relativePath, db)) {
        outdatedIds.push(id);
        continue;
      }

      if (await isAlertOutdatedByMissingSymbols(alert, absolutePath, fileContentsCache)) {
        outdatedIds.push(id);
        continue;
      }
    } catch {
      outdatedIds.push(id);
      continue;
    }

    if (await isAlertOutdatedByRuntimeDependencies(projectPath, detectedAtMs, runtimeDependencyMtimes)) {
      outdatedIds.push(id);
    }
  }

  return outdatedIds;
}
