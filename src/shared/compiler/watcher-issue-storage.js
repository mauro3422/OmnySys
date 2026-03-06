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

  const getMaxMtimeRecursively = async (absolutePath) => {
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isDirectory()) {
        return stat.mtimeMs;
      }

      let maxMtimeMs = stat.mtimeMs;
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(absolutePath, entry.name);
        const entryMtimeMs = await getMaxMtimeRecursively(entryPath);
        if (entryMtimeMs > maxMtimeMs) {
          maxMtimeMs = entryMtimeMs;
        }
      }

      return maxMtimeMs;
    } catch {
      return 0;
    }
  };

  const getRuntimeDependencyMtime = async (relativePath) => {
    if (!relativePath) return 0;
    if (runtimeDependencyMtimes.has(relativePath)) {
      return runtimeDependencyMtimes.get(relativePath);
    }

    const absolutePath = path.resolve(projectPath, relativePath);
    const mtimeMs = await getMaxMtimeRecursively(absolutePath);

    runtimeDependencyMtimes.set(relativePath, mtimeMs);
    return mtimeMs;
  };

  for (const alert of alerts) {
    const id = alert?.id;
    if (!Number.isInteger(id)) continue;

    const detectedAtMs = Date.parse(alert?.detectedAt || '');
    if (!Number.isFinite(detectedAtMs)) continue;

    const relativePath = String(alert?.filePath || '');
    if (!relativePath) continue;

    const absolutePath = path.resolve(projectPath, relativePath);
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.mtimeMs > (detectedAtMs + 1000)) {
        outdatedIds.push(id);
        continue;
      }
    } catch {
      // If the file no longer exists, regular lifecycle cleanup will handle it.
    }

    for (const dependencyPath of WATCHER_RUNTIME_DEPENDENCY_PATHS) {
      const dependencyMtimeMs = await getRuntimeDependencyMtime(dependencyPath);
      if (dependencyMtimeMs > (detectedAtMs + 1000)) {
        outdatedIds.push(id);
        break;
      }
    }
  }

  return outdatedIds;
}
